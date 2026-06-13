<?php

namespace App\Http\Controllers;

use App\Models\BackupLog;
use App\Models\Setting;
use App\Services\GoogleSheetService;
use App\Services\PemilihReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;

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
            'backup_logs' => BackupLog::query()
                ->orderByDesc('backed_up_at')
                ->take(10)
                ->get(),
        ]);
    }

    public function update(Request $request, GoogleSheetService $googleSheetService): RedirectResponse
    {
        abort_unless($request->user()->canAccessModule('settings.google-sheet'), 403);

        $validated = $request->validate([
            'google_sheet_url' => ['required', 'url'],
        ]);

        $googleSheetService->updateSheetUrl($validated['google_sheet_url']);

        return back()->with('success', 'Tetapan URL Google Sheet berjaya dikemaskini.');
    }

    public function uploadPemilih(Request $request, PemilihReportService $reportService): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        abort_unless($request->user()->canAccessModule('settings.upload-pemilih'), 403);

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
        $db = config('database.connections.mysql') ?? [];
        $filename = 'DB_PAS_' . now('Asia/Kuala_Lumpur')->format('d-m-Y_H-iA') . '.sql';

        $result = $this->runMysqldump($mysqldump, $db);

        if ($result['returnVar'] !== 0) {
            $errorMsg = $result['stderr'] ?: ($result['stdout'] ?: 'mysqldump gagal dijalankan. Pastikan mysqldump dipasang atau set DB_DUMP_PATH dalam .env.');
            logger()->error('Backup database gagal (exit ' . $result['returnVar'] . '): ' . $errorMsg);
            return redirect()->route('settings.edit')->with('error', 'Backup gagal: ' . $errorMsg);
        }

        BackupLog::create([
            'user_name' => $request->user()->name,
            'backed_up_at' => now('Asia/Kuala_Lumpur'),
        ]);

        BackupLog::query()
            ->whereKey(
                BackupLog::query()
                    ->orderByDesc('backed_up_at')
                    ->skip(4)
                    ->take(PHP_INT_MAX)
                    ->pluck('id')
            )
            ->delete();

        $headers = [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        return new HttpResponse($result['stdout'], 200, $headers);
    }

    private function runMysqldump(string $mysqldump, array $db): array
    {
        $command = sprintf(
            '%s --host=%s --port=%s --user=%s --password=%s --single-transaction --no-tablespaces --routines --triggers %s',
            escapeshellarg($mysqldump),
            escapeshellarg($db['host'] ?? '127.0.0.1'),
            escapeshellarg($db['port'] ?? '3306'),
            escapeshellarg($db['username'] ?? 'root'),
            escapeshellarg($db['password'] ?? ''),
            escapeshellarg($db['database'] ?? '')
        );

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = @proc_open($command, $descriptors, $pipes);

        if (!is_resource($process)) {
            return ['stdout' => '', 'stderr' => 'proc_open gagal', 'returnVar' => -1];
        }

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);

        fclose($pipes[0]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        $returnVar = proc_close($process);

        return [
            'stdout' => $stdout !== false ? $stdout : '',
            'stderr' => $stderr !== false ? $stderr : '',
            'returnVar' => $returnVar,
        ];
    }

    private function findMysqldumpPath(): string
    {
        if ($path = env('DB_DUMP_PATH')) {
            return $path;
        }

        $path = $this->which('mysqldump');
        if ($path !== '') {
            return $path;
        }

        $candidates = [
            '/usr/bin/mysqldump',
            '/usr/local/bin/mysqldump',
            '/opt/homebrew/bin/mysqldump',
        ];

        $xamppRoot = dirname(PHP_BINARY, 2);
        $candidates[] = $xamppRoot . DIRECTORY_SEPARATOR . 'mysql' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'mysqldump.exe';

        foreach ($candidates as $candidate) {
            if (@file_exists($candidate)) {
                return $candidate;
            }
        }

        return 'mysqldump';
    }

    private function which(string $cmd): string
    {
        try {
            if (PHP_OS_FAMILY === 'Windows') {
                return trim((string) shell_exec("where {$cmd} 2>nul"));
            }

            $result = trim((string) shell_exec("command -v {$cmd} 2>/dev/null"));
            if ($result === '') {
                $result = trim((string) shell_exec("which {$cmd} 2>/dev/null"));
            }
            return $result;
        } catch (\Throwable $e) {
            return '';
        }
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
