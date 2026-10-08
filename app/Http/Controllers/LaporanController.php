<?php

namespace App\Http\Controllers;

use App\Models\Cawangan;
use App\Models\User;
use App\Services\CulaanMessageService;
use App\Services\N8nWebhookService;
use App\Services\PemilihBaruService;
use App\Services\PemilihReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LaporanController extends Controller
{
    public function index(Request $request, PemilihReportService $reportService, CulaanMessageService $messageService, PemilihBaruService $pemilihBaru): Response
    {
        $snapshot = $reportService->getLatestUdmSnapshot();
        $report = $reportService->buildFromDatabase();

        return Inertia::render('Laporan', [
            'report' => $report,
            'pemilih_baru_movement' => $pemilihBaru->monthlyMovementReport(),
            'culaan_message' => $messageService->build($report),
            'pemilih_report' => $reportService->getMetadata(),
            'udm_snapshot' => $snapshot ? $snapshot->rows : null,
            'udm_snapshot_meta' => $snapshot ? [
                'cutoff_day' => $snapshot->cutoff_day,
                'period_start' => $snapshot->period_start->format('d-m-Y'),
                'period_end' => $snapshot->period_end->format('d-m-Y'),
                'snapshot_date' => $snapshot->snapshot_date->format('d-m-Y'),
                'snapshot_time' => $snapshot->uploaded_at
                    ? Carbon::parse($snapshot->uploaded_at, 'Asia/Kuala_Lumpur')->format('d-m-Y h:iA')
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

    public function sendN8nMessage(Request $request, N8nWebhookService $n8nWebhook): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:10000'],
        ]);

        $url = $n8nWebhook->activeUrl();
        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            return response()->json([
                'success' => false,
                'message' => 'URL webhook n8n tidak sah. Sila semak tetapan.',
            ], 422);
        }

        try {
            $response = $n8nWebhook->send($validated['message']);
        } catch (\Throwable $e) {
            logger()->error('Gagal menghantar mesej culaan ke n8n.', [
                'environment' => config('app.env'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Sambungan ke webhook n8n gagal. Sila cuba lagi.',
            ], 502);
        }

        if ($response->failed()) {
            logger()->warning('Webhook n8n menolak mesej culaan.', [
                'status' => $response->status(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Webhook n8n menolak mesej (HTTP '.$response->status().').',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mesej culaan berjaya dihantar ke n8n.',
        ]);
    }

    private function ahliPasStats(User $user): array
    {
        $query = Cawangan::query();
        $scope = $user->accessScope();

        if ($scope !== null) {
            if (filled($scope['cawangan_id'])) {
                $query->whereKey($scope['cawangan_id']);
            } elseif (filled($scope['dm'])) {
                $query->where('udm', $scope['dm']);
            }
        }

        return [
            'total' => (int) (clone $query)->sum('member_count'),
            'by_udm' => (clone $query)
                ->select('udm')
                ->selectRaw('SUM(member_count) as total')
                ->groupBy('udm')
                ->orderByDesc('total')
                ->orderBy('udm')
                ->get()
                ->map(fn (Cawangan $row) => [
                    'name' => $row->udm,
                    'total' => (int) $row->total,
                ])
                ->values()
                ->all(),
        ];
    }
}
