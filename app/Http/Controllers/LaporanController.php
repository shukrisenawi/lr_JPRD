<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\PemilihReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LaporanController extends Controller
{
    public function index(PemilihReportService $reportService): Response
    {
        $path = Setting::valueOf('pemilih_report_file_path', PemilihReportService::DEFAULT_SAMPLE_PATH);

        return Inertia::render('Laporan', [
            'report' => $reportService->buildFromPath($path),
        ]);
    }

    public function upload(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pemilih_file' => ['required', 'file', 'max:51200', 'mimes:xls,xlsx,csv,ods,html'],
        ]);

        $file = $validated['pemilih_file'];
        $extension = strtolower($file->getClientOriginalExtension() ?: 'xls');
        $filename = 'pemilih-latest.' . $extension;
        $directory = storage_path('app/reports');

        if (! is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $file->move($directory, $filename);

        Setting::setValue('pemilih_report_file_path', $directory . DIRECTORY_SEPARATOR . $filename);

        return redirect()
            ->route('laporan.index')
            ->with('success', 'Fail pemilih berjaya dimuat naik untuk laporan.');
    }
}
