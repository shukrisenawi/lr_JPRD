<?php

namespace App\Http\Controllers;

use App\Services\PemilihReportService;
use Inertia\Inertia;
use Inertia\Response;

class LaporanController extends Controller
{
    public function index(PemilihReportService $reportService): Response
    {
        return Inertia::render('Laporan', [
            'report' => $reportService->buildFromDatabase(),
            'pemilih_report' => $reportService->getMetadata(),
        ]);
    }
}
