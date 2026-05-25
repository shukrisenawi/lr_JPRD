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
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function exportDatabase(Request $request): StreamedResponse
    {
        abort_unless($request->user()->isMasterAdmin(), 403);

        $db = config('database.connections.mysql');
        $filename = 'Pemilih_' . now('Asia/Kuala_Lumpur')->format('d-m-Y_H.iA') . '.sql';

        $headers = [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $command = sprintf(
            'mysqldump --host=%s --user=%s --password=%s %s',
            escapeshellarg($db['host'] ?? 'localhost'),
            escapeshellarg($db['username'] ?? ''),
            escapeshellarg($db['password'] ?? ''),
            escapeshellarg($db['database'] ?? '')
        );

        return new StreamedResponse(function () use ($command) {
            passthru($command);
        }, 200, $headers);
    }

    public function importDatabase(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isMasterAdmin(), 403);

        $validated = $request->validate([
            'backup_file' => ['required', 'file', 'max:102400'],
        ]);

        $file = $validated['backup_file'];
        $tempPath = $file->storeAs('backup', 'restore-temp.sql');
        $fullPath = storage_path('app/' . $tempPath);

        $db = config('database.connections.mysql');

        $command = sprintf(
            'mysql --host=%s --user=%s --password=%s %s < %s 2>&1',
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
