<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PemilihRecord;
use App\Models\SpokasMember;
use App\Models\SpokasMigrationResult;
use App\Models\SpokasMigrationRun;
use App\Services\SpokasMigrationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SpokasController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureMasterAdmin();

        return Inertia::render('Admin/Spokas', $this->pageProps($request));
    }

    public function migrate(Request $request, SpokasMigrationService $migration): Response
    {
        $this->ensureMasterAdmin();

        $run = SpokasMigrationRun::query()->create([
            'user_id' => $request->user()->id,
            'source_count' => SpokasMember::query()->count(),
            'updated_count' => 0,
            'ic_match_count' => 0,
            'name_match_count' => 0,
            'failed_count' => 0,
            'ic_matches' => [],
            'name_matches' => [],
            'failed' => [],
            'executed_at' => now(),
        ]);
        $run->update($migration->migrate($run));

        return Inertia::render('Admin/Spokas', $this->pageProps($request, $run));
    }

    public function rollback(Request $request, SpokasMigrationService $migration): RedirectResponse
    {
        $this->ensureMasterAdmin();

        $run = SpokasMigrationRun::query()->latest('id')->firstOrFail();
        $restoredCount = $migration->rollback($run);

        return to_route('admin.spokas.index')
            ->with('success', "{$restoredCount} rekod pemilih berjaya dikembalikan ke data asal.");
    }

    private function ensureMasterAdmin(): void
    {
        abort_unless(request()->user()?->isMasterAdmin(), 403);
    }

    private function pageProps(Request $request, ?SpokasMigrationRun $run = null): array
    {
        $run ??= SpokasMigrationRun::query()->latest('id')->first();
        $tab = $request->query('tab');
        $tab = in_array($tab, ['ic', 'name', 'failed'], true) ? $tab : 'ic';
        $search = trim((string) $request->query('search', ''));
        $results = null;

        if ($run) {
            $query = SpokasMigrationResult::query()
                ->where('spokas_migration_run_id', $run->id)
                ->where('category', $tab);

            if ($search !== '') {
                $query->where(function ($builder) use ($search): void {
                    $like = "%{$search}%";
                    $builder
                        ->where('name', 'like', $like)
                        ->orWhere('member_number', 'like', $like)
                        ->orWhere('ic_birth', 'like', $like)
                        ->orWhere('pemilih_name', 'like', $like)
                        ->orWhere('pemilih_no_kp', 'like', $like)
                        ->orWhere('reason', 'like', $like);
                });
            }

            $paginator = $query
                ->orderBy('id')
                ->paginate(50)
                ->withQueryString();

            $results = [
                'data' => $paginator->getCollection()
                    ->map(fn (SpokasMigrationResult $result) => $this->formatResult($result))
                    ->values()
                    ->all(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ];
        }

        return [
            'spokas_count' => SpokasMember::query()->count(),
            'pemilih_count' => PemilihRecord::query()->count(),
            'run' => $run?->resultPayload(),
            'results' => $results,
            'active_tab' => $tab,
            'search' => $search,
            'last_migrated_at' => $run?->executed_at?->format('d-m-Y H:i:s'),
        ];
    }

    private function formatResult(SpokasMigrationResult $result): array
    {
        return [
            'spokas_id' => $result->spokas_member_id,
            'name' => $result->name,
            'member_number' => $result->member_number,
            'ic_birth' => $result->ic_birth,
            'match_by' => $result->match_by,
            'pemilih_id' => $result->pemilih_id,
            'pemilih_name' => $result->pemilih_name,
            'pemilih_no_kp' => $result->pemilih_no_kp,
            'previous_no_ahli' => $result->previous_no_ahli,
            'reason' => $result->reason,
        ];
    }
}
