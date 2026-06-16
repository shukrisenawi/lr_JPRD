<?php

namespace App\Http\Controllers;

use App\Models\CulaWorkItem;
use App\Models\GroupPemilih;
use App\Models\PemilihRecord;
use App\Services\PemilihReportService;
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
    public function index(Request $request, PemilihReportService $reportService): Response
    {
        $filters = $this->resolveFilters($request);

        if ($filters['data_error']) {
            $voters = $this->paginateDataErrorVoters($filters);
        } else {
            $voters = $this->paginateVoters($filters);
        }

        $groups = $this->availableGroups();
        $report = $this->buildReportData($filters);
        $dataErrorCount = $this->countDataErrorVoters($filters);

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
            'requires_udm' => false,
            'summary' => [
                'total' => $voters->total(),
            ],
            'report' => $report,
            'report_by_group' => $reportByGroup,
            'pemilih_report' => $reportService->getMetadata(),
            'udms' => $this->availableUdms(),
            'localities' => $this->availableLocalities($filters['udm'], $filters['locality']),
            'groups' => $groups,
            'voters' => $voters,
            'available_cula_codes' => $this->availableCulaCodes(),
            'available_races' => $this->availableRaces(),
            'data_error_count' => $dataErrorCount,
        ]);
    }

    public function approveDataError(Request $request, PemilihRecord $pemilihRecord): RedirectResponse|JsonResponse
    {
        if (! $pemilihRecord->cula_remark) {
            abort(422, 'Rekod ini tiada isu data error.');
        }

        $action = $request->input('action', 'keep');

        if ($action === 'clear') {
            $pemilihRecord->update([
                'cula_code' => null,
                'cula_display_label' => null,
                'cula_remark' => null,
            ]);
        } elseif ($action === 'update') {
            $pemilihRecord->update([
                'cula_code' => $request->input('cula_code'),
                'cula_display_label' => $request->input('cula_display_label'),
                'cula_remark' => null,
            ]);
        } else {
            $pemilihRecord->update([
                'cula_remark' => null,
            ]);
        }

        if ($request->expectsJson()) {
            $message = match ($action) {
                'clear' => 'Data culaan dikosongkan dan remark diluluskan.',
                'update' => 'Kod culaan dikemaskini dan remark diluluskan.',
                default => 'Kod culaan lama dikekalkan dan remark diluluskan.',
            };

            return response()->json([
                'message' => $message,
                'approved' => true,
                'voter_id' => $pemilihRecord->id,
            ]);
        }

        return redirect()
            ->route('culaan.index')
            ->with('success', 'Data error berjaya diluluskan.');
    }

    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json(['suggestions' => []]);
        }

        $filters = $this->resolveFilters($request);

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

    public function updateCulaAndMark(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        $request->validate([
            'cula_code' => 'required|string',
            'cula_display_label' => 'required|string',
        ]);

        $pemilihRecord->update([
            'cula_code' => $request->input('cula_code'),
            'cula_display_label' => $request->input('cula_display_label'),
        ]);

        CulaWorkItem::query()->firstOrCreate(
            ['pemilih_record_id' => $pemilihRecord->id],
            [
                'marked_by' => $request->user()->id,
                'marked_at' => now(),
                'notes' => null,
            ]
        );

        return response()->json([
            'message' => 'Kod culaan dikemaskini dan pemilih ditanda sebagai sudah diproses.',
            'voter_id' => $pemilihRecord->id,
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        $filters = $this->resolveFilters($request);

        if ($filters['udm'] === '') {
            return response()->json(['voters' => []]);
        }

        $voters = $this->buildEligibleVotersQuery($filters, true)
            ->whereDoesntHave('culaWorkItem')
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

        $pemilihRecord->update([
            'cula_code' => '?',
            'cula_display_label' => null,
        ]);

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
            ->where('status', 'aktif');

        request()->user()?->applyScopeToPemilihQuery($query);

        $query->when(
                ! $filters['show_marked'],
                function (Builder $builder) use ($groupKodCulas) {
                    $builder->where(function (Builder $q) use ($groupKodCulas) {
                        $q->whereNull('cula_code')
                            ->orWhere('cula_code', '')
                            ->orWhere('cula_code', '?')
                            ->orWhere('cula_code', 'TIADA')
                            ->orWhereRaw('UPPER(COALESCE(cula_display_label, \'\')) like ?', ['%BELUM DICULA%']);

                        if ($groupKodCulas !== null) {
                            $q->orWhereIn('cula_code', $groupKodCulas);
                        }
                    });
                }
            )
            ->when(
                $usingCustomCulaCodes && ! $filters['show_marked'],
                fn (Builder $builder) => $builder->whereIn('cula_code', $filters['cula_codes'])
            )
            ->when($filters['udm'] !== '', fn (Builder $builder) => $builder->where('dm', $filters['udm']))
            ->when($filters['locality'] !== '', fn (Builder $builder) => $builder->where('locality', $filters['locality']))
            ->when($filters['group_id'] !== null, fn (Builder $builder) => $this->applyGroupDemographicFilters($builder, $filters['group_id']))
            ->when($filters['custom_mode'], fn (Builder $builder) => $this->applyCustomDemographicFilters($builder, $filters))
            ->when($filters['has_phone'], fn (Builder $builder) => $builder->where(function (Builder $q) {
                $q->whereNotNull('phone_mobile')->where('phone_mobile', '!=', '')
                  ->orWhereNotNull('phone_home')->where('phone_home', '!=', '');
            }));

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
        return $this->buildEligibleVotersQuery($filters)
            ->with('culaWorkItem.marker')
            ->when($filters['show_marked'], fn (Builder $q) => $q->orderByDesc(
                CulaWorkItem::select('marked_at')->whereColumn('pemilih_record_id', 'pemilih_records.id')
            ))
            ->orderByRaw("
                CASE
                    WHEN LENGTH(no_kp) >= 2 AND SUBSTRING(no_kp, 1, 2) > RIGHT(YEAR(CURDATE()), 2)
                        THEN 1900 + CAST(SUBSTRING(no_kp, 1, 2) AS UNSIGNED)
                    WHEN LENGTH(no_kp) >= 2
                        THEN 2000 + CAST(SUBSTRING(no_kp, 1, 2) AS UNSIGNED)
                    ELSE 9999
                END DESC
            ")
            ->orderBy('no_kp')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PemilihRecord $voter) => $this->transformVoter($voter));
    }

    private function availableUdms(): array
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('dm')
            ->where('dm', '!=', '');

        request()->user()?->applyScopeToPemilihQuery($query);

        return $query
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->map(fn ($v) => trim($v))
            ->unique()
            ->values()
            ->all();
    }

    private function availableLocalities(string $udm, string $selectedLocality = ''): array
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->when($udm !== '', fn (Builder $builder) => $builder->where('dm', $udm))
            ->whereNotNull('locality')
            ->where('locality', '!=', '');

        request()->user()?->applyScopeToPemilihQuery($query);

        $localities = $query
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

        $user = $request->user();
        $scope = $user?->accessScope();
        $defaultUdm = filled($scope['dm'] ?? null) ? $scope['dm'] : '';
        $defaultLocality = filled($scope['locality'] ?? null) ? $scope['locality'] : '';

        $requestedUdm = trim((string) $request->query('udm', ''));
        $requestedLocality = trim((string) $request->query('locality', ''));

        // Scoped users cannot view outside their scope
        if ($scope !== null) {
            if ($defaultUdm !== '' && $requestedUdm !== '' && $requestedUdm !== $defaultUdm) {
                $requestedUdm = $defaultUdm;
            }
            if ($defaultLocality !== '' && $requestedLocality !== '' && $requestedLocality !== $defaultLocality) {
                $requestedLocality = $defaultLocality;
            }
            if ($requestedUdm === '' && $defaultUdm !== '') {
                $requestedUdm = $defaultUdm;
            }
            if ($requestedLocality === '' && $defaultLocality !== '') {
                $requestedLocality = $defaultLocality;
            }
        }

        return [
            'udm' => $requestedUdm,
            'locality' => $requestedLocality,
            'show_marked' => $request->boolean('show_marked'),
            'group_id' => $groupId,
            'custom_mode' => $customMode,
            'data_error' => $request->boolean('data_error'),
            'cula_codes' => $request->query('cula_codes'),
            'keturunan' => trim((string) $request->query('keturunan', '')),
            'jantina' => trim((string) $request->query('jantina', '')),
            'umur_dari' => $request->query('umur_dari') !== null && $request->query('umur_dari') !== '' ? (int) $request->query('umur_dari') : null,
            'umur_hingga' => $request->query('umur_hingga') !== null && $request->query('umur_hingga') !== '' ? (int) $request->query('umur_hingga') : null,
            'has_phone' => $request->boolean('has_phone'),
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
            'avatar_url' => $voter->avatarUrl(),
            'name' => $voter->name,
            'no_kp' => $voter->no_kp,
            'old_ic' => $voter->old_ic,
            'no_ahli' => $voter->no_ahli,
            'phone_mobile' => $voter->phone_mobile,
            'phone_home' => $voter->phone_home,
            'address' => $voter->address,
            'age' => $this->calculateAge($voter->no_kp),
            'dm' => trim($voter->dm),
            'locality' => $voter->locality,
            'status' => $voter->status,
            'cula_code' => $voter->cula_code,
            'cula_display_label' => $voter->cula_display_label,
            'cula_remark' => $voter->cula_remark,
            'is_marked' => $voter->culaWorkItem !== null,
            'marked_by_name' => $voter->culaWorkItem?->marker?->name,
            'marked_by_id' => $voter->culaWorkItem?->marked_by,
            'telegram_identity' => $voter->no_kp ?: $voter->old_ic,
            'is_manual' => $voter->is_manual,
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

        $age = (int) now()->year - ($century + $yy);

        return $age < 18 ? null : $age;
    }

    private function isEligibleForCulaan(PemilihRecord $voter): bool
    {
        if ($voter->status !== 'aktif') {
            return false;
        }

        $label = mb_strtoupper((string) $voter->cula_display_label);
        $code = (string) ($voter->cula_code ?? '');

        return $code === '' || $code === '?' || $code === 'TIADA' || str_contains($label, 'BELUM DICULA');
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
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '');

        request()->user()?->applyScopeToPemilihQuery($query);

        return $query
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
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('race')
            ->where('race', '!=', '');

        request()->user()?->applyScopeToPemilihQuery($query);

        return $query
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

        request()->user()?->applyScopeToPemilihQuery($query);

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
            ->where('cula_code', '!=', 'TIADA')
            ->count();

        $belumDicula = $total - $sudahDicula;

        $culaBreakdown = (clone $query)
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->where('cula_code', '!=', 'TIADA')
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

        $completedCulaBreakdown = (clone $query)
            ->whereHas('culaWorkItem')
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->where('cula_code', '!=', 'TIADA')
            ->select('cula_code', DB::raw('MAX(cula_display_label) as display_label'), DB::raw('COUNT(*) as total'))
            ->groupBy('cula_code')
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
            'completed_cula_breakdown' => $completedCulaBreakdown,
        ];
    }

    private function countDataErrorVoters(array $filters): int
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('cula_remark')
            ->when($filters['udm'] !== '', fn (Builder $b) => $b->where('dm', $filters['udm']))
            ->when($filters['locality'] !== '', fn (Builder $b) => $b->where('locality', $filters['locality']));

        request()->user()?->applyScopeToPemilihQuery($query);

        $this->applyGroupDemographicFilters($query, $filters['group_id']);

        if ($filters['custom_mode']) {
            $this->applyCustomDemographicFilters($query, $filters);
        }

        return $query->count();
    }

    private function paginateDataErrorVoters(array $filters): LengthAwarePaginator
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('cula_remark')
            ->when($filters['udm'] !== '', fn (Builder $b) => $b->where('dm', $filters['udm']))
            ->when($filters['locality'] !== '', fn (Builder $b) => $b->where('locality', $filters['locality']));

        request()->user()?->applyScopeToPemilihQuery($query);

        $this->applyGroupDemographicFilters($query, $filters['group_id']);

        if ($filters['custom_mode']) {
            $this->applyCustomDemographicFilters($query, $filters);
        }

        return $query
            ->orderByRaw("
                CASE
                    WHEN LENGTH(no_kp) >= 2 AND SUBSTRING(no_kp, 1, 2) > RIGHT(YEAR(CURDATE()), 2)
                        THEN 1900 + CAST(SUBSTRING(no_kp, 1, 2) AS UNSIGNED)
                    WHEN LENGTH(no_kp) >= 2
                        THEN 2000 + CAST(SUBSTRING(no_kp, 1, 2) AS UNSIGNED)
                    ELSE 9999
                END DESC
            ")
            ->orderBy('no_kp')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PemilihRecord $voter) => $this->transformVoter($voter));
    }
}
