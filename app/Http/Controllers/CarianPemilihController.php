<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\PemilihReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CarianPemilihController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('CarianPemilih');
    }

    public function search(Request $request, PemilihReportService $reportService)
    {
        $path = Setting::valueOf('pemilih_report_file_path', PemilihReportService::DEFAULT_SAMPLE_PATH);

        return response()->json([
            'suggestions' => $reportService->searchVoters(
                (string) $request->query('q', ''),
                $path,
            ),
        ]);
    }
}
