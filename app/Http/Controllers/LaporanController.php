<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PemilihReportService;
use Inertia\Inertia;
use Inertia\Response;

class LaporanController extends Controller
{
    public function index(PemilihReportService $reportService): Response
    {
        $snapshot = $reportService->getLatestUdmSnapshot();

        return Inertia::render('Laporan', [
            'report' => $reportService->buildFromDatabase(),
            'pemilih_report' => $reportService->getMetadata(),
            'udm_snapshot' => $snapshot ? $snapshot->rows : null,
            'udm_snapshot_meta' => $snapshot ? [
                'cutoff_day' => $snapshot->cutoff_day,
                'period_start' => $snapshot->period_start->format('d-m-Y'),
                'period_end' => $snapshot->period_end->format('d-m-Y'),
                'snapshot_date' => $snapshot->snapshot_date->format('d-m-Y'),
                'snapshot_time' => $snapshot->uploaded_at
                    ? \Carbon\Carbon::parse($snapshot->uploaded_at, 'Asia/Kuala_Lumpur')->format('d-m-Y h:iA')
                    : $snapshot->created_at?->setTimezone('Asia/Kuala_Lumpur')->format('d-m-Y h:iA'),
            ] : null,
            'recent_logins' => User::query()
                ->whereNotNull('last_login_at')
                ->orderByDesc('last_login_at')
                ->limit(10)
                ->get(['name', 'last_login_at'])
                ->map(fn (User $user) => [
                    'name' => $user->name,
                    'last_login_at' => $user->last_login_at->setTimezone('Asia/Kuala_Lumpur')->format('d-m-Y h:iA'),
                ]),
        ]);
    }
}
