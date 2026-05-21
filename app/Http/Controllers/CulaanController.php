<?php

namespace App\Http\Controllers;

use App\Models\CulaWorkItem;
use App\Models\GroupPemilih;
use App\Models\PemilihRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CulaanController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->resolveFilters($request);
        $voters = $this->paginateVoters($filters);
        $groups = $this->availableGroups();
        $report = $this->buildReportData($filters);

        $reportByGroup = [];
        if ($filters['group_id'] === null && ! $filters['custom_mode']) {
            foreach ($groups as $group) {
                $gf = $filters;
                $gf['group_id'] = $group['id'];
                $reportByGroup[] = [
                    'group' => $group,
                    'report' => $this->buildReportData($gf),
                ];
            }
        }

        return Inertia::render('Culaan/Index', [
            'filters' => $filters,
            'requires_udm' => true,
            'summary' => [
                'total' => $voters->total(),
            ],
            'report' => $report,
            'report_by_group' => $reportByGroup,
            'udms' => $this->availableUdms(),
            'localities' => $this->availableLocalities($filters['udm'], $filters['locality']),
            'groups' => $groups,
            'voters' => $voters,
            'available_cula_codes' => $this->availableCulaCodes(),
            'available_races' => $this->availableRaces(),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json(['suggestions' => []]);
        }

        $filters = $this->resolveFilters($request);

        if ($filters['udm'] === '') {
            return response()->json(['suggestions' => []]);
        }

        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($query)) ?: []));

        $suggestions = $this->buildEligibleVotersQuery($filters)
            ->with('culaWorkItem.marker')
            ->where(function (Builder $builder) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $like = '%'.$keyword.'%';

                    $builder->where(function (Builder $subQuery) use ($keyword, $like) {
                        $subQuery->whereRaw('LOWER(name) like ?', [$like])
                            ->orWhereRaw('LOWER(dm) like ?', [$like])
                            ->orWhereRaw('LOWER(locality) like ?', [$like]);

                        if (preg_match('/\d/', $keyword)) {
                            $digitLike = '%'.preg_replace('/\D+/', '', $keyword).'%';
                            $subQuery->orWhere('no_kp', 'like', $digitLike)
                                ->orWhere('old_ic', 'like', $digitLike)
                                ->orWhere('phone_home', 'like', $digitLike)
                                ->orWhere('phone_mobile', 'like', $digitLike);
                        }
                    });
                }
            })
            ->orderBy('name')
            ->limit(8)
            ->get()
            ->map(fn (PemilihRecord $voter) => $this->transformVoter($voter))
            ->values();

        return response()->json([
            'suggestions' => $suggestions,
        ]);
    }

    public function storeMark(Request $request, PemilihRecord $pemilihRecord): RedirectResponse|JsonResponse
    {
        abort_unless($this->isEligibleForCulaan($pemilihRecord), 422);

        CulaWorkItem::query()->firstOrCreate(
            ['pemilih_record_id' => $pemilihRecord->id],
            [
                'marked_by' => $request->user()->id,
                'marked_at' => now(),
                'notes' => null,
            ]
        );

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Pemilih ditanda sebagai sudah diproses.',
                'marked' => true,
                'voter_id' => $pemilihRecord->id,
            ]);
        }

        return redirect()
            ->route('culaan.index')
            ->with('success', 'Pemilih ditanda sebagai sudah diproses.');
    }

    public function export(Request $request): JsonResponse
    {
        $filters = $this->resolveFilters($request);

        if ($filters['udm'] === '') {
            return response()->json(['voters' => []]);
        }

        $voters = $this->buildEligibleVotersQuery($filters)
            ->with('culaWorkItem.marker')
            ->orderBy('no_kp')
            ->get()
            ->map(fn (PemilihRecord $voter) => $this->transformVoter($voter))
            ->values();

        return response()->json(['voters' => $voters]);
    }

    public function destroyMark(Request $request, PemilihRecord $pemilihRecord): RedirectResponse|JsonResponse
    {
        CulaWorkItem::query()
            ->where('pemilih_record_id', $pemilihRecord->id)
            ->delete();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Tanda culaan berjaya dibuka semula.',
                'marked' => false,
                'voter_id' => $pemilihRecord->id,
            ]);
        }

        return redirect()
            ->route('culaan.index')
            ->with('success', 'Tanda culaan berjaya dibuka semula.');
    }

    private function buildEligibleVotersQuery(array $filters, bool $skipMarkedFilter = false): Builder
    {
        $groupKodCulas = $this->resolveGroupKodCulas($filters['group_id']);

        $usingCustomCulaCodes = $filters['custom_mode']
            && is_array($filters['cula_codes'])
            && count($filters['cula_codes']) > 0;

        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where(function (Builder $builder) use ($groupKodCulas, $usingCustomCulaCodes, $filters) {
                if ($groupKodCulas !== null) {
                    $builder->whereIn('cula_code', $groupKodCulas);
                } elseif ($usingCustomCulaCodes) {
                    $builder->whereIn('cula_code', $filters['cula_codes']);
                } else {
                    $builder->whereNull('cula_code')
                        ->orWhere('cula_code', '')
                        ->orWhere('cula_code', '?');
                }
                if (! $usingCustomCulaCodes) {
                    $builder->orWhereRaw('UPPER(COALESCE(cula_display_label, \'\')) like ?', ['%BELUM DICULA%']);
                }
            })
            ->when($filters['udm'] !== '', fn (Builder $builder) => $builder->where('dm', $filters['udm']))
            ->when($filters['locality'] !== '', fn (Builder $builder) => $builder->where('locality', $filters['locality']))
            ->when($filters['group_id'] !== null, fn (Builder $builder) => $this->applyGroupDemographicFilters($builder, $filters['group_id']))
            ->when($filters['custom_mode'], fn (Builder $builder) => $this->applyCustomDemographicFilters($builder, $filters));

        if (! $skipMarkedFilter) {
            $query->when(
                $filters['show_marked'],
                fn (Builder $builder) => $builder->whereHas('culaWorkItem'),
                fn (Builder $builder) => $builder->whereDoesntHave('culaWorkItem')
            );
        }

        return $query;
    }

    private function resolveGroupKodCulas(?int $groupId): ?array
    {
        if ($groupId === null) {
            return null;
        }

        $group = GroupPemilih::with('kodCulas')->find($groupId);

        if (! $group) {
            return null;
        }

        $kodCulas = $group->kodCulas->pluck('kod_cula')->filter()->values();

        return $kodCulas->isNotEmpty() ? $kodCulas->all() : null;
    }

    private function paginateVoters(array $filters): LengthAwarePaginator
    {
        if ($filters['udm'] === '') {
            return new LengthAwarePaginator(
                collect(),
                0,
                20,
                LengthAwarePaginator::resolveCurrentPage(),
                [
                    'path' => request()->url(),
                    'query' => request()->query(),
                ]
            );
        }

        return $this->buildEligibleVotersQuery($filters)
            ->with('culaWorkItem.marker')
            ->orderBy('no_kp')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PemilihRecord $voter) => $this->transformVoter($voter));
    }

    private function availableUdms(): array
    {
        return PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->values()
            ->all();
    }

    private function availableLocalities(string $udm, string $selectedLocality = ''): array
    {
        if ($udm === '') {
            return [];
        }

        $localities = PemilihRecord::query()
            ->where('status', 'aktif')
            ->when($udm !== '', fn (Builder $builder) => $builder->where('dm', $udm))
            ->whereNotNull('locality')
            ->where('locality', '!=', '')
            ->select('locality')
            ->distinct()
            ->orderBy('locality')
            ->pluck('locality')
            ->values()
            ->all();

        if ($selectedLocality === '' || ! in_array($selectedLocality, $localities, true)) {
            return $localities;
        }

        return array_values([
            $selectedLocality,
            ...array_values(array_filter($localities, fn (string $locality) => $locality !== $selectedLocality)),
        ]);
    }

    private function resolveFilters(Request $request): array
    {
        $rawGroupId = $request->query('group_id', '');
        $customMode = $rawGroupId === 'custom';
        $groupId = $rawGroupId !== '' && ! $customMode ? (int) $rawGroupId : null;

        return [
            'udm' => trim((string) $request->query('udm', '')),
            'locality' => trim((string) $request->query('locality', '')),
            'show_marked' => $request->boolean('show_marked'),
            'group_id' => $groupId,
            'custom_mode' => $customMode,
            'cula_codes' => $request->query('cula_codes'),
            'keturunan' => trim((string) $request->query('keturunan', '')),
            'jantina' => trim((string) $request->query('jantina', '')),
            'umur_dari' => $request->query('umur_dari') !== null && $request->query('umur_dari') !== '' ? (int) $request->query('umur_dari') : null,
            'umur_hingga' => $request->query('umur_hingga') !== null && $request->query('umur_hingga') !== '' ? (int) $request->query('umur_hingga') : null,
        ];
    }

    private function availableGroups(): array
    {
        return GroupPemilih::query()
            ->with('kodCulas')
            ->orderBy('sort_order')
            ->orderBy('nama_group')
            ->get()
            ->map(fn (GroupPemilih $group) => [
                'id' => $group->id,
                'nama_group' => $group->nama_group,
                'keturunan' => $group->keturunan,
                'jantina' => $group->jantina,
                'umur_dari' => $group->umur_dari,
                'umur_akhir' => $group->umur_akhir,
                'kod_culas' => $group->kodCulas->pluck('kod_cula')->values(),
            ])
            ->values()
            ->all();
    }

    private function transformVoter(PemilihRecord $voter): array
    {
        return [
            'id' => $voter->id,
            'name' => $voter->name,
            'no_kp' => $voter->no_kp,
            'old_ic' => $voter->old_ic,
            'phone_mobile' => $voter->phone_mobile,
            'phone_home' => $voter->phone_home,
            'address' => $voter->address,
            'age' => $this->calculateAge($voter->no_kp),
            'dm' => $voter->dm,
            'locality' => $voter->locality,
            'status' => $voter->status,
            'cula_code' => $voter->cula_code,
            'cula_display_label' => $voter->cula_display_label,
            'is_marked' => $voter->culaWorkItem !== null,
            'marked_by_name' => $voter->culaWorkItem?->marker?->name,
            'telegram_identity' => $voter->no_kp ?: $voter->old_ic,
        ];
    }

    private function calculateAge(?string $noKp): ?int
    {
        if (! $noKp || strlen($noKp) < 2 || ! preg_match('/^(\d{2})/', $noKp, $m)) {
            return null;
        }

        $yy = (int) $m[1];
        $currentYear = (int) now()->format('y');
        $century = $yy > $currentYear ? 1900 : 2000;

        return (int) now()->year - ($century + $yy);
    }

    private function isEligibleForCulaan(PemilihRecord $voter): bool
    {
        if ($voter->status !== 'aktif') {
            return false;
        }

        $label = mb_strtoupper((string) $voter->cula_display_label);
        $code = (string) ($voter->cula_code ?? '');

        return $code === '' || $code === '?' || str_contains($label, 'BELUM DICULA');
    }

    private function applyGroupDemographicFilters(Builder $query, ?int $groupId): void
    {
        if ($groupId === null) {
            return;
        }

        $group = GroupPemilih::with('kodCulas')->find($groupId);

        if (! $group) {
            return;
        }

        if ($group->keturunan) {
            $query->where('race', $group->keturunan);
        }

        if ($group->jantina) {
            $query->where('gender', $group->jantina);
        }

        if ($group->umur_dari !== null || $group->umur_akhir !== null) {
            $query->whereNotNull('no_kp');
            $query->where('no_kp', '!=', '');
            $query->whereRaw('LENGTH(no_kp) >= 2');

            $currentYY = (int) now()->format('y');
            $currentYear = (int) now()->year;
            $minAge = $group->umur_dari ?? 0;
            $maxAge = $group->umur_akhir ?? 999;

            $validPrefixes = [];
            for ($yy = 0; $yy <= 99; $yy++) {
                $century = $yy > $currentYY ? 1900 : 2000;
                $birthYear = $century + $yy;
                $age = $currentYear - $birthYear;
                if ($age >= $minAge && $age <= $maxAge) {
                    $validPrefixes[] = str_pad((string) $yy, 2, '0', STR_PAD_LEFT);
                }
            }

            if (! empty($validPrefixes)) {
                $query->where(function (Builder $q) use ($validPrefixes) {
                    foreach ($validPrefixes as $prefix) {
                        $q->orWhere('no_kp', 'like', $prefix.'%');
                    }
                });
            }
        }
    }

    private function applyCustomDemographicFilters(Builder $query, array $filters): void
    {
        if ($filters['keturunan'] !== '') {
            $query->where('race', $filters['keturunan']);
        }

        if ($filters['jantina'] !== '') {
            $query->where('gender', $filters['jantina']);
        }

        $umurDari = $filters['umur_dari'];
        $umurHingga = $filters['umur_hingga'];

        if ($umurDari !== null || $umurHingga !== null) {
            $query->whereNotNull('no_kp');
            $query->where('no_kp', '!=', '');
            $query->whereRaw('LENGTH(no_kp) >= 2');

            $currentYY = (int) now()->format('y');
            $currentYear = (int) now()->year;
            $minAge = $umurDari ?? 0;
            $maxAge = $umurHingga ?? 999;

            $validPrefixes = [];
            for ($yy = 0; $yy <= 99; $yy++) {
                $century = $yy > $currentYY ? 1900 : 2000;
                $birthYear = $century + $yy;
                $age = $currentYear - $birthYear;
                if ($age >= $minAge && $age <= $maxAge) {
                    $validPrefixes[] = str_pad((string) $yy, 2, '0', STR_PAD_LEFT);
                }
            }

            if (! empty($validPrefixes)) {
                $query->where(function (Builder $q) use ($validPrefixes) {
                    foreach ($validPrefixes as $prefix) {
                        $q->orWhere('no_kp', 'like', $prefix.'%');
                    }
                });
            }
        }
    }

    private function availableCulaCodes(): array
    {
        return PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->select('cula_code', DB::raw('MAX(cula_display_label) as display_label'))
            ->groupBy('cula_code')
            ->orderBy('cula_code')
            ->get()
            ->map(fn ($r) => [
                'code' => $r->cula_code,
                'label' => $r->display_label,
            ])
            ->values()
            ->all();
    }

    private function availableRaces(): array
    {
        return PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('race')
            ->where('race', '!=', '')
            ->select('race')
            ->distinct()
            ->orderBy('race')
            ->pluck('race')
            ->values()
            ->all();
    }

    private function buildReportData(array $filters): array
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->when($filters['udm'] !== '', fn (Builder $b) => $b->where('dm', $filters['udm']))
            ->when($filters['locality'] !== '', fn (Builder $b) => $b->where('locality', $filters['locality']));

        if ($filters['custom_mode'] && is_array($filters['cula_codes']) && count($filters['cula_codes']) > 0) {
            $query->whereIn('cula_code', $filters['cula_codes']);
        }

        $this->applyGroupDemographicFilters($query, $filters['group_id']);

        if ($filters['custom_mode']) {
            $this->applyCustomDemographicFilters($query, $filters);
        }

        $total = (clone $query)->count();

        $sudahDicula = (clone $query)
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->count();

        $belumDicula = $total - $sudahDicula;

        $culaBreakdown = (clone $query)
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->select('cula_code', DB::raw('MAX(cula_display_label) as display_label'), DB::raw('COUNT(*) as total'))
            ->groupBy('cula_code')
            ->orderByDesc('total')
            ->limit(12)
            ->get()
            ->map(fn ($r) => [
                'code' => $r->cula_code,
                'display_label' => $r->display_label,
                'total' => (int) $r->total,
            ])
            ->values()
            ->all();

        return [
            'total' => $total,
            'sudah_dicula' => $sudahDicula,
            'belum_dicula' => $belumDicula,
            'peratus_siap' => $total > 0 ? round(($sudahDicula / $total) * 100, 1) : 0,
            'cula_breakdown' => $culaBreakdown,
        ];
    }
}
