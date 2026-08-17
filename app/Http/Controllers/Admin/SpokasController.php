<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PemilihRecord;
use App\Models\SpokasMember;
use App\Models\SpokasMigrationResult;
use App\Models\SpokasMigrationRun;
use App\Services\SpokasMigrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SpokasController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureModuleAccess();

        return Inertia::render('Admin/Spokas', $this->pageProps($request));
    }

    public function migrate(Request $request, SpokasMigrationService $migration): RedirectResponse
    {
        $this->ensureModuleAccess();

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

        return to_route('admin.spokas.index')
            ->with('success', 'Migrasi SPoKAS selesai diproses.');
    }

    public function rollback(Request $request, SpokasMigrationService $migration): RedirectResponse
    {
        $this->ensureModuleAccess();

        $clearedCount = $migration->rollback();

        return to_route('admin.spokas.index')
            ->with('success', "{$clearedCount} nombor ahli PAS daripada data SPoKAS berjaya dikosongkan.");
    }

    public function approveNameMatch(Request $request, SpokasMigrationResult $result): RedirectResponse|JsonResponse
    {
        $this->ensureModuleAccess();
        $remark = $this->validatedRemark($request);
        $name = $result->name ?: 'pemilih';
        $memberNumber = $result->member_number ?: '-';

        DB::transaction(function () use ($result, $remark): void {
            $result = SpokasMigrationResult::query()->lockForUpdate()->findOrFail($result->id);
            abort_unless($result->category === 'name' && $result->pemilih_id !== null, 422);

            $alreadyApproved = SpokasMigrationResult::query()
                ->where('spokas_migration_run_id', $result->spokas_migration_run_id)
                ->where('pemilih_id', $result->pemilih_id)
                ->whereIn('category', ['ic', 'approved'])
                ->exists();
            abort_if($alreadyApproved, 422, 'Rekod pemilih ini telah menerima nombor ahli daripada padanan lain.');

            PemilihRecord::query()->lockForUpdate()->findOrFail($result->pemilih_id)->update([
                'no_ahli' => $result->member_number,
            ]);
            $decision = ['category' => 'approved'];
            if ($remark !== null) {
                $decision['remark'] = $remark;
            }
            $result->update($decision);
            SpokasMigrationRun::query()
                ->whereKey($result->spokas_migration_run_id)
                ->increment('updated_count');
        });

        $message = "Nama {$name} berjaya dikemaskini. No. Ahli PAS {$memberNumber} telah disimpan.";

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
            ]);
        }

        return back()->with('success', $message);
    }

    public function rejectNameMatch(Request $request, SpokasMigrationResult $result): RedirectResponse|JsonResponse
    {
        $this->ensureModuleAccess();
        $remark = $this->validatedRemark($request);
        $name = $result->name ?: 'pemilih';

        $decision = ['category' => 'rejected'];
        if ($remark !== null) {
            $decision['remark'] = $remark;
        }

        $updated = SpokasMigrationResult::query()
            ->whereKey($result->id)
            ->where('category', 'name')
            ->update($decision);
        abort_unless($updated === 1, 422);

        $message = "Nama {$name} telah ditolak.";

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
            ]);
        }

        return to_route('admin.spokas.index', ['tab' => 'rejected'])
            ->with('success', $message);
    }

    public function saveRemark(Request $request, SpokasMigrationResult $result): RedirectResponse|JsonResponse
    {
        $this->ensureModuleAccess();
        $remark = $this->validatedRemark($request, true);
        $name = $result->name ?: 'pemilih';

        $updated = SpokasMigrationResult::query()
            ->whereKey($result->id)
            ->where('category', 'name')
            ->update(['remark' => $remark]);
        abort_unless($updated === 1, 422);

        $message = "Remark nama {$name} berjaya disimpan.";

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
            ]);
        }

        return back()->with('success', $message);
    }

    private function ensureModuleAccess(): void
    {
        abort_unless(request()->user()?->canAccessModule('spokas'), 403);
    }

    private function validatedRemark(Request $request, bool $required = false): ?string
    {
        $validated = $request->validate([
            'remark' => [$required ? 'required' : 'nullable', 'string', 'max:1000'],
        ]);
        $remark = trim((string) ($validated['remark'] ?? ''));

        return $remark !== '' ? $remark : null;
    }

    private function pageProps(Request $request, ?SpokasMigrationRun $run = null): array
    {
        $run ??= SpokasMigrationRun::query()->latest('id')->first();
        $tab = $request->query('tab');
        $tab = in_array($tab, ['ic', 'name', 'approved', 'rejected', 'not_found'], true) ? $tab : 'ic';
        $search = trim((string) $request->query('search', ''));
        $results = null;

        $resultCounts = [
            'ic' => 0,
            'name' => 0,
            'approved' => 0,
            'rejected' => 0,
            'not_found' => 0,
        ];

        if ($run) {
            $resultCounts = array_replace($resultCounts, SpokasMigrationResult::query()
                ->where('spokas_migration_run_id', $run->id)
                ->selectRaw('category, count(*) as total')
                ->groupBy('category')
                ->pluck('total', 'category')
                ->map(fn (mixed $total): int => (int) $total)
                ->all());
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
                        ->orWhere('reason', 'like', $like)
                        ->orWhere('remark', 'like', $like);
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
            'result_counts' => $resultCounts,
            'active_tab' => $tab,
            'search' => $search,
            'last_migrated_at' => $run?->executed_at?->format('d-m-Y H:i:s'),
        ];
    }

    private function formatResult(SpokasMigrationResult $result): array
    {
        return [
            'id' => $result->id,
            'spokas_id' => $result->spokas_member_id,
            'name' => $result->name,
            'member_number' => $result->member_number,
            'ic_birth' => $result->ic_birth,
            'ic_old' => $result->ic_old,
            'match_by' => $result->match_by,
            'pemilih_id' => $result->pemilih_id,
            'pemilih_name' => $result->pemilih_name,
            'pemilih_no_kp' => $result->pemilih_no_kp,
            'pemilih_old_ic' => $result->pemilih_old_ic,
            'previous_no_ahli' => $result->previous_no_ahli,
            'reason' => $result->reason,
            'remark' => $result->remark,
        ];
    }
}
