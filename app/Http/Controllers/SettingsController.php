<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\GoogleSheetService;
use App\Services\PemilihReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(GoogleSheetService $googleSheetService): Response
    {
        return Inertia::render('Settings/Edit', [
            'settings' => [
                'google_sheet_url' => $googleSheetService->getSheetUrl(),
                'pemilih_report' => $this->pemilihReportMetadata(),
            ],
        ]);
    }

    public function update(Request $request, GoogleSheetService $googleSheetService): RedirectResponse
    {
        $validated = $request->validate([
            'google_sheet_url' => ['required', 'url'],
        ]);

        $googleSheetService->updateSheetUrl($validated['google_sheet_url']);

        return back()->with('success', 'Tetapan URL Google Sheet berjaya dikemaskini.');
    }

    public function uploadPemilih(Request $request, PemilihReportService $reportService): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        ini_set('max_execution_time', '300');
        ini_set('memory_limit', '512M');

        $validated = $request->validate([
            'pemilih_file' => ['required', 'file', 'max:51200', 'extensions:xls,xlsx,csv,ods,html'],
        ]);

        $file = $validated['pemilih_file'];
        $extension = strtolower($file->getClientOriginalExtension() ?: 'xls');
        $filename = 'pemilih-latest.'.$extension;
        $directory = storage_path('app/reports');

        if (! is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $file->move($directory, $filename);

        $storedPath = $directory.DIRECTORY_SEPARATOR.$filename;

        try {
            Setting::setValue('pemilih_report_file_path', $storedPath);
            Setting::setValue('pemilih_report_uploaded_by', $request->user()->name);
            Setting::setValue('pemilih_report_uploaded_at', now('Asia/Kuala_Lumpur')->format('d-m-Y h:i A'));
            $reportService->syncUploadedVoters($storedPath);
            $reportService->buildFromPath($storedPath);
        } catch (\Throwable $e) {
            if ($request->ajax() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ralat memproses fail: '.$e->getMessage(),
                ], 500);
            }

            return redirect()
                ->route('settings.edit')
                ->with('error', 'Ralat memproses fail: '.$e->getMessage());
        }

        if ($request->ajax() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Fail pemilih berjaya dimuat naik sebagai data terkini sistem.',
            ]);
        }

        return redirect()
            ->route('settings.edit')
            ->with('success', 'Fail pemilih berjaya dimuat naik sebagai data terkini sistem.');
    }

    public function exportDatabase(Request $request): HttpResponse|RedirectResponse
    {
        abort_unless($request->user()->canAccessModule('settings.backup-database'), 403);

        $mysqldump = $this->findMysqldumpPath();
        $db = config('database.connections.mysql');
        $filename = 'DB_PAS_' . now('Asia/Kuala_Lumpur')->format('d-m-Y_H-iA') . '.sql';

        $command = sprintf(
            '%s --host=%s --user=%s --password=%s --single-transaction --routines --triggers %s 2>&1',
            escapeshellarg($mysqldump),
            escapeshellarg($db['host'] ?? 'localhost'),
            escapeshellarg($db['username'] ?? ''),
            escapeshellarg($db['password'] ?? ''),
            escapeshellarg($db['database'] ?? '')
        );

        exec($command, $output, $returnVar);

        if ($returnVar !== 0) {
            $errorMsg = !empty($output) ? implode("\n", $output) : 'mysqldump gagal dijalankan. Pastikan path ke mysqldump betul.';
            return redirect()->route('settings.edit')->with('error', 'Backup gagal: ' . $errorMsg);
        }

        $headers = [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        return new HttpResponse(implode("\n", $output), 200, $headers);
    }

    public function importDatabase(Request $request): RedirectResponse
    {
        abort_unless($request->user()->canAccessModule('settings.backup-database'), 403);

        $validated = $request->validate([
            'backup_file' => ['required', 'file', 'max:102400'],
        ]);

        $file = $validated['backup_file'];
        $tempPath = $file->storeAs('backup', 'restore-temp.sql');
        $fullPath = storage_path('app/' . $tempPath);

        $mysql = $this->findMysqlPath();
        $db = config('database.connections.mysql');

        $command = sprintf(
            '%s --host=%s --user=%s --password=%s %s < %s 2>&1',
            escapeshellarg($mysql),
            escapeshellarg($db['host'] ?? 'localhost'),
            escapeshellarg($db['username'] ?? ''),
            escapeshellarg($db['password'] ?? ''),
            escapeshellarg($db['database'] ?? ''),
            escapeshellarg($fullPath)
        );

        exec($command, $output, $returnVar);
        Storage::delete($tempPath);

        if ($returnVar !== 0) {
            return redirect()
                ->route('settings.edit')
                ->with('error', 'Import gagal: ' . implode("\n", $output));
        }

        return redirect()
            ->route('settings.edit')
            ->with('success', 'Database berjaya dipulihkan.');
    }

    private function findMysqldumpPath(): string
    {
        if ($path = env('DB_DUMP_PATH')) {
            return $path;
        }

        $path = trim((string) shell_exec('where mysqldump 2>nul'));
        if ($path !== '' && file_exists($path)) {
            return $path;
        }

        $xamppRoot = dirname(PHP_BINARY, 2);
        $candidate = $xamppRoot . DIRECTORY_SEPARATOR . 'mysql' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'mysqldump.exe';
        if (file_exists($candidate)) {
            return $candidate;
        }

        return 'mysqldump';
    }

    private function findMysqlPath(): string
    {
        if ($path = env('DB_DUMP_PATH')) {
            return $path;
        }

        $path = trim((string) shell_exec('where mysql 2>nul'));
        if ($path !== '' && file_exists($path)) {
            return $path;
        }

        $xamppRoot = dirname(PHP_BINARY, 2);
        $candidate = $xamppRoot . DIRECTORY_SEPARATOR . 'mysql' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'mysql.exe';
        if (file_exists($candidate)) {
            return $candidate;
        }

        return 'mysql';
    }

    private function pemilihReportMetadata(): array
    {
        $path = Setting::valueOf('pemilih_report_file_path', PemilihReportService::DEFAULT_SAMPLE_PATH);
        $uploadedAt = Setting::valueOf('pemilih_report_uploaded_at');

        if ($uploadedAt) {
            try {
                $uploadedAt = \Carbon\Carbon::parse($uploadedAt, 'Asia/Kuala_Lumpur')->format('d-m-Y h:i A');
            } catch (\Exception $e) {
                // keep original if parse fails
            }
        }

        return [
            'name' => is_string($path) ? basename($path) : null,
            'exists' => is_string($path) && file_exists($path),
            'uploaded_by' => Setting::valueOf('pemilih_report_uploaded_by'),
            'uploaded_at' => $uploadedAt,
        ];
    }
}
