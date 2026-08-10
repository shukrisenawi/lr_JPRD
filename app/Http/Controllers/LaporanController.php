<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use App\Models\User;
use App\Services\PemilihReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LaporanController extends Controller
{
    public function index(Request $request, PemilihReportService $reportService): Response
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
            'ahli_pas_stats' => $request->user()?->canAccessModule('ahli-pas')
                ? $this->ahliPasStats($request->user())
                : null,
        ]);
    }

    private function ahliPasStats(User $user): array
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereRaw("TRIM(COALESCE(no_ahli, '')) NOT IN ('', '-')");

        $user->applyScopeToPemilihQuery($query);

        $labelExpression = "COALESCE(NULLIF(NULLIF(dm, ''), '-'), 'Tidak Ditetapkan')";

        return [
            'total' => (clone $query)->count(),
            'by_udm' => (clone $query)
                ->selectRaw("{$labelExpression} as name, COUNT(*) as total")
                ->groupByRaw($labelExpression)
                ->orderByDesc('total')
                ->orderByRaw($labelExpression)
                ->get()
                ->map(fn (PemilihRecord $row) => [
                    'name' => $row->name,
                    'total' => (int) $row->total,
                ])
                ->values()
                ->all(),
        ];
    }
}
