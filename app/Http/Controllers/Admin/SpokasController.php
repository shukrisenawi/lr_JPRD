<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PemilihRecord;
use App\Models\SpokasMember;
use App\Services\SpokasMigrationService;
use Inertia\Inertia;
use Inertia\Response;

class SpokasController extends Controller
{
    public function index(): Response
    {
        $this->ensureMasterAdmin();

        return Inertia::render('Admin/Spokas', [
            'spokas_count' => SpokasMember::query()->count(),
            'pemilih_count' => PemilihRecord::query()->count(),
            'results' => null,
        ]);
    }

    public function migrate(SpokasMigrationService $migration): Response
    {
        $this->ensureMasterAdmin();

        return Inertia::render('Admin/Spokas', [
            'spokas_count' => SpokasMember::query()->count(),
            'pemilih_count' => PemilihRecord::query()->count(),
            'results' => $migration->migrate(),
        ]);
    }

    private function ensureMasterAdmin(): void
    {
        abort_unless(request()->user()?->isMasterAdmin(), 403);
    }
}
