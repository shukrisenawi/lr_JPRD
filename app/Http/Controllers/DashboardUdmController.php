<?php

namespace App\Http\Controllers;

use App\Services\DanaSummaryService;
use App\Services\DashboardUdmService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardUdmController extends Controller
{
    public function __invoke(Request $request, DashboardUdmService $dashboard, DanaSummaryService $dana): Response
    {
        abort_unless($request->user()->access_level === 'udm' && ! $request->user()->isMasterAdmin(), 403);

        return Inertia::render('DashboardUdm', [
            'udm' => $request->user()->scope_key,
            'statistics' => $dashboard->summary($request->user()),
            'payments' => filled($request->user()->scope_key)
                ? $dana->summary($request->user())['totals']
                : ['count' => 0, 'total_bayaran' => '0.00'],
        ]);
    }
}
