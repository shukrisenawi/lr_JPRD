<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardUdmController extends Controller
{
    public function __invoke(Request $request): Response
    {
        abort_unless($request->user()->access_level === 'udm' && ! $request->user()->isMasterAdmin(), 403);

        return Inertia::render('DashboardUdm', [
            'udm' => $request->user()->scope_key,
        ]);
    }
}
