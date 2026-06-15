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
        return Inertia::render('Laporan', [
            'report' => $reportService->buildFromDatabase(),
            'pemilih_report' => $reportService->getMetadata(),
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
