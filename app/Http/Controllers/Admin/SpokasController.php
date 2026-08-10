<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PemilihRecord;
use App\Models\SpokasMember;
use App\Models\SpokasMigrationRun;
use App\Services\SpokasMigrationService;
use Inertia\Inertia;
use Inertia\Response;

class SpokasController extends Controller
{
    public function index(): Response
    {
        $this->ensureMasterAdmin();

        return Inertia::render('Admin/Spokas', $this->pageProps());
    }

    public function migrate(SpokasMigrationService $migration): Response
    {
        $this->ensureMasterAdmin();

        $results = $migration->migrate();
        $run = SpokasMigrationRun::query()->create([
            'user_id' => request()->user()->id,
            'source_count' => $results['source_count'],
            'updated_count' => $results['updated_count'],
            'ic_matches' => $results['ic_matches'],
            'name_matches' => $results['name_matches'],
            'failed' => $results['failed'],
            'executed_at' => now(),
        ]);

        return Inertia::render('Admin/Spokas', $this->pageProps($run));
    }

    private function ensureMasterAdmin(): void
    {
        abort_unless(request()->user()?->isMasterAdmin(), 403);
    }

    private function pageProps(?SpokasMigrationRun $run = null): array
    {
        $run ??= SpokasMigrationRun::query()->latest('id')->first();

        return [
            'spokas_count' => SpokasMember::query()->count(),
            'pemilih_count' => PemilihRecord::query()->count(),
            'results' => $run?->resultPayload(),
            'last_migrated_at' => $run?->executed_at?->format('d-m-Y H:i:s'),
        ];
    }
}
