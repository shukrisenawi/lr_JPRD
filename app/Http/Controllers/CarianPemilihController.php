<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
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
                8,
                $request->user(),
            ),
        ]);
    }

    public function updateNoAhli(Request $request)
    {
        $validated = $request->validate([
            'record_id' => 'required|integer|exists:pemilih_records,id',
            'no_ahli' => 'nullable|string|max:255',
        ]);

        $record = PemilihRecord::findOrFail($validated['record_id']);
        $record->no_ahli = $validated['no_ahli'];
        $record->save();

        return response()->json([
            'success' => true,
            'message' => 'No. Ahli berjaya dikemaskini.',
        ]);
    }
}
