<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\PemilihReportService;
use Inertia\Inertia;
use Inertia\Response;

class LaporanController extends Controller
{
    public function index(PemilihReportService $reportService): Response
    {
        $path = Setting::valueOf('pemilih_report_file_path', PemilihReportService::DEFAULT_SAMPLE_PATH);

        return Inertia::render('Laporan', [
            'report' => $reportService->buildFromPath($path),
            'pemilih_report' => $reportService->getMetadata(),
        ]);
    }
}
