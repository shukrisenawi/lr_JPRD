<?php

namespace App\Http\Controllers;

use App\Models\CulaWorkItem;
use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
use App\Models\User;
use App\Support\CulaCodes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class KeluargaPemilihController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'cula_codes' => ['nullable', 'array', 'max:40'],
            'cula_codes.*' => ['required', 'string', Rule::in([...array_column(CulaCodes::options(), 'code'), 'belum_dicula'])],
            'cula_code' => $this->culaCodeFilterRule(),
        ]);
        $user = $request->user();
        $searchFilter = trim((string) ($validated['q'] ?? ''));
        $tabFilter = match ($request->query('tab')) {
            'unassigned' => 'unassigned',
            'reviewed' => 'reviewed',
            default => 'families',
        };
        $culaCodes = $tabFilter === 'unassigned' ? $this->normalizeCulaCodeFilters($validated) : [];
        $votersByUdm = $this->activeMalayVoterQuery($user)
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->select('dm')
            ->selectRaw('COUNT(*) as voter_count')
            ->selectRaw('SUM(CASE WHEN EXISTS (SELECT 1 FROM pemilih_family_members WHERE pemilih_family_members.pemilih_record_id = pemilih_records.id) THEN 1 ELSE 0 END) as assigned_count')
            ->groupBy('dm')
            ->orderBy('dm')
            ->get()
            ->keyBy('dm');
        $requestedUdm = trim((string) $request->query('udm', ''));
        $scopedUdm = ($user->access_level ?? 'jprd') === 'udm' ? trim((string) $user->scope_key) : '';
        $udmFilter = $scopedUdm !== ''
            ? $scopedUdm
            : ($votersByUdm->has($requestedUdm) ? $requestedUdm : '');
        $localities = collect();
        $localityFilter = '';
        if ($udmFilter !== '') {
            $localities = $this->activeMalayVoterQuery($user, $udmFilter)
                ->whereNotNull('locality')
                ->where('locality', '!=', '')
                ->select('locality')
                ->distinct()
                ->orderBy('locality')
                ->pluck('locality');
            $requestedLocality = trim((string) $request->query('locality', ''));
            if ($localities->contains($requestedLocality)) {
                $localityFilter = $requestedLocality;
            }
        }

        $voters = $this->activeMalayVoterQuery($user, $udmFilter, $localityFilter);
        $familyQueryBase = $this->visibleFamilyQuery($user, $udmFilter, $localityFilter);
        if ($searchFilter !== '') {
            $familyQueryBase->whereHas('members', function (Builder $query) use ($user, $udmFilter, $localityFilter, $searchFilter): void {
                $user->applyScopeToPemilihQuery($query);
                $this->whereMalayRace($query);
                if ($udmFilter !== '') {
                    $query->where('pemilih_records.dm', $udmFilter);
                }
                if ($localityFilter !== '') {
                    $query->where('pemilih_records.locality', $localityFilter);
                }
                $this->applySearchTerm($query, $searchFilter);
            });
        }
        $familyTabCounts = [
            'families' => (clone $familyQueryBase)->whereNull('reviewed_at')->count(),
            'reviewed' => (clone $familyQueryBase)->whereNotNull('reviewed_at')->count(),
        ];
        $familiesQuery = (clone $familyQueryBase);
        if ($tabFilter === 'reviewed') {
            $familiesQuery->whereNotNull('reviewed_at');
        } else {
            $familiesQuery->whereNull('reviewed_at');
        }
        if ($searchFilter !== '') {
            $familyRanking = PemilihRecord::query()
                ->join('pemilih_family_members', 'pemilih_family_members.pemilih_record_id', '=', 'pemilih_records.id')
                ->whereColumn('pemilih_family_members.pemilih_family_id', 'pemilih_families.id');
            $user->applyScopeToPemilihQuery($familyRanking);
            $this->whereMalayRace($familyRanking);
            if ($udmFilter !== '') {
                $familyRanking->where('pemilih_records.dm', $udmFilter);
            }
            if ($localityFilter !== '') {
                $familyRanking->where('pemilih_records.locality', $localityFilter);
            }
            $this->applySearchTerm($familyRanking, $searchFilter);
            [$scoreSql, $scoreBindings] = $this->searchRelevanceSql($searchFilter, false);
            $familyRanking->selectRaw('MAX('.$scoreSql.')', $scoreBindings);
            $familiesQuery->orderByDesc($familyRanking);
        }
        $familiesQuery->orderByDesc('id');
        $allVoters = $this->activeMalayVoterQuery($user);
        $allFamiliesQuery = $this->visibleFamilyQuery($user);

        $familyCountsByUdmQuery = DB::table('pemilih_family_members')
            ->join('pemilih_records', 'pemilih_records.id', '=', 'pemilih_family_members.pemilih_record_id')
            ->whereNotNull('pemilih_records.dm')
            ->where('pemilih_records.dm', '!=', '')
            ->select('pemilih_records.dm')
            ->selectRaw('COUNT(DISTINCT pemilih_family_members.pemilih_family_id) as family_count')
            ->groupBy('pemilih_records.dm');
        $user->applyScopeToPemilihQuery($familyCountsByUdmQuery);
        $this->whereMalayRace($familyCountsByUdmQuery);
        $familyCountsByUdm = $familyCountsByUdmQuery->pluck('family_count', 'dm');
        $udmSummaries = $votersByUdm->map(fn ($summary, string $udm): array => [
            'udm' => $udm,
            'families' => (int) ($familyCountsByUdm[$udm] ?? 0),
            'voters' => (int) $summary->voter_count,
            'assigned' => (int) $summary->assigned_count,
            'unassigned' => (int) $summary->voter_count - (int) $summary->assigned_count,
        ])->values();

        $unassignedVotersQuery = $this->activeMalayVoterQuery($user, $udmFilter, $localityFilter)
            ->whereDoesntHave('families');
        if ($searchFilter !== '') {
            $this->applySearchTerm($unassignedVotersQuery, $searchFilter);
        }
        $includeUncodedVoters = in_array('belum_dicula', $culaCodes, true);
        $selectedCulaCodes = array_values(array_diff($culaCodes, ['belum_dicula']));
        if ($includeUncodedVoters || $selectedCulaCodes !== []) {
            $unassignedVotersQuery->where(function (Builder $query) use ($includeUncodedVoters, $selectedCulaCodes): void {
                if ($includeUncodedVoters) {
                    $query->where(function (Builder $uncodedQuery): void {
                        $uncodedQuery->whereNull('cula_code')
                            ->orWhereIn('cula_code', ['', '?', '0', 'TIADA'])
                            ->orWhereRaw("UPPER(COALESCE(cula_display_label, '')) LIKE ?", ['%BELUM DICULA%']);
                    });
                }

                if ($selectedCulaCodes !== []) {
                    $includeUncodedVoters
                        ? $query->orWhereIn('cula_code', $selectedCulaCodes)
                        : $query->whereIn('cula_code', $selectedCulaCodes);
                }
            });
        }

        $familyCount = $familyTabCounts[$tabFilter === 'reviewed' ? 'reviewed' : 'families'];
        $unassignedCount = (clone $unassignedVotersQuery)->count();
        $requestedPage = max(1, (int) $request->query('page', 1));
        $activePageSize = $tabFilter === 'unassigned' ? 20 : 12;
        $activeCount = $tabFilter === 'unassigned' ? $unassignedCount : $familyCount;
        $lastPage = max(1, (int) ceil($activeCount / $activePageSize));
        if ($requestedPage > $lastPage) {
            return redirect()->route('keluarga-pemilih.index', $this->filterRouteParams([
                'udm' => $udmFilter,
                'locality' => $localityFilter,
                'q' => $searchFilter,
                'cula_codes' => $culaCodes,
                'tab' => $tabFilter,
                'page' => $lastPage,
            ]));
        }

        $families = (clone $familiesQuery)
            ->with([
                'father' => function ($query) use ($user, $udmFilter, $localityFilter): void {
                    $user->applyScopeToPemilihQuery($query);
                    $this->whereMalayRace($query);
                    if ($udmFilter !== '') {
                        $query->where('pemilih_records.dm', $udmFilter);
                    }
                    if ($localityFilter !== '') {
                        $query->where('pemilih_records.locality', $localityFilter);
                    }
                },
                'members' => function ($query) use ($user, $udmFilter, $localityFilter): void {
                    $user->applyScopeToPemilihQuery($query);
                    $this->whereMalayRace($query);
                    if ($udmFilter !== '') {
                        $query->where('pemilih_records.dm', $udmFilter);
                    }
                    if ($localityFilter !== '') {
                        $query->where('pemilih_records.locality', $localityFilter);
                    }
                    $query->orderBy('pemilih_records.name');
                },
            ])
            ->orderByDesc('id')
            ->paginate(12)
            ->withQueryString()
            ->through(fn (PemilihFamily $family): array => [
                'id' => $family->id,
                'name' => $family->name,
                'father_id' => $family->father?->id,
                'father_name' => $family->father?->name,
                'reviewed_at' => $family->reviewed_at,
                'reviewed_by' => $family->reviewed_by,
                'created_at' => $family->created_at,
                'members' => $family->members->map(fn (PemilihRecord $voter): array => $this->voterPayload($voter)),
                'member_count' => $family->members->count(),
            ]);
        $unassignedVoters = $unassignedVotersQuery
            ->orderByRaw($this->parentNameSql().' ASC')
            ->orderByRaw("CASE WHEN NULLIF(TRIM(COALESCE(pemilih_records.no_kp, '')), '') IS NULL THEN 1 ELSE 0 END")
            ->orderBy('pemilih_records.no_kp')
            ->orderBy('pemilih_records.id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PemilihRecord $voter): array => [
                ...$this->voterPayload($voter),
                'parent_name' => $this->parentName($voter->name),
            ]);

        return Inertia::render('KeluargaPemilih/Index', [
            'families' => $families,
            'unassignedVoters' => $unassignedVoters,
            'available_cula_codes' => CulaCodes::options(),
            'filters' => [
                'udm' => $udmFilter,
                'locality' => $localityFilter,
                'q' => $searchFilter,
                'cula_codes' => $culaCodes,
                'cula_code' => count($culaCodes) === 1 ? $culaCodes[0] : '',
                'tab' => $tabFilter,
            ],
            'familyTabCounts' => $familyTabCounts,
            'localities' => $localities->values(),
            'udmSummaries' => $udmSummaries,
            'allStats' => [
                'families' => (clone $allFamiliesQuery)->count(),
                'voters' => (clone $allVoters)->count(),
                'assigned' => (clone $allVoters)->whereHas('families')->count(),
                'unassigned' => (clone $allVoters)->whereDoesntHave('families')->count(),
            ],
            'stats' => [
                'families' => $familyCount,
                'voters' => (clone $voters)->count(),
                'assigned' => (clone $voters)->whereHas('families')->count(),
                'unassigned' => (clone $voters)->whereDoesntHave('families')->count(),
            ],
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'anchor_id' => ['nullable', 'integer'],
            'anchor_as_father' => ['nullable', 'boolean'],
            'udm' => ['nullable', 'string', 'max:255'],
            'locality' => ['nullable', 'string', 'max:255'],
        ]);
        $user = $request->user();
        $term = trim((string) ($validated['q'] ?? ''));
        $anchorIsFather = (bool) ($validated['anchor_as_father'] ?? false);
        $udm = trim((string) ($validated['udm'] ?? ''));
        $locality = trim((string) ($validated['locality'] ?? ''));
        if ($locality !== '' && $udm === '') {
            throw ValidationException::withMessages(['locality' => 'Pilih UDM sebelum memilih lokaliti.']);
        }
        $anchor = null;

        if (! empty($validated['anchor_id'])) {
            $anchor = $this->activeMalayVoterQuery($user, $udm, $locality)->findOrFail($validated['anchor_id']);
        }

        $query = $this->activeMalayVoterQuery($user, $udm, $locality)->whereDoesntHave('families');
        if ($anchor) {
            $query->where('pemilih_records.id', '!=', $anchor->id);
        }

        if ($term !== '') {
            $this->applySearchTerm($query, $term);
            $this->orderSearchResults($query, $term);
            $records = $query->limit(200)->get();
        } elseif ($anchor) {
            $records = $this->suggestionCandidates($query, $anchor, $anchorIsFather);
        } else {
            $records = collect();
        }

        $results = $records
            ->map(function (PemilihRecord $voter) use ($anchor, $anchorIsFather, $term): array {
                return [
                    ...$this->voterPayload(
                        $voter,
                        $anchor ? $this->matchDetails($anchor, $voter, $anchorIsFather) : null,
                    ),
                    'search_score' => $term !== '' ? $this->searchRelevanceScore($voter, $term) : 0,
                ];
            })
            ->sort(function (array $left, array $right): int {
                return ($right['search_score'] <=> $left['search_score'])
                    ?: ($right['match_score'] <=> $left['match_score'])
                    ?: strcasecmp((string) $left['name'], (string) $right['name']);
            })
            ->take(80)
            ->map(function (array $voter): array {
                unset($voter['search_score']);

                return $voter;
            })
            ->values();

        return response()->json(['voters' => $results]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'pemilih_ids' => ['required', 'array', 'min:1', 'max:30'],
            'pemilih_ids.*' => ['required', 'integer', 'distinct', Rule::exists('pemilih_records', 'id')],
            ...$this->routeFilterRules(),
        ]);
        $user = $request->user();
        $udm = trim((string) ($validated['udm'] ?? ''));
        $locality = trim((string) ($validated['locality'] ?? ''));
        if ($locality !== '' && $udm === '') {
            throw ValidationException::withMessages(['locality' => 'Pilih UDM sebelum memilih lokaliti.']);
        }

        $family = DB::transaction(function () use ($validated, $user, $udm, $locality): PemilihFamily {
            $voters = $this->lockUnassignedVoters($user, $validated['pemilih_ids'], $udm, $locality);
            $name = trim((string) ($validated['name'] ?? ''));
            if ($name === '') {
                $name = 'Keluarga '.($voters->first()->name ?: 'Pemilih');
            }

            $family = PemilihFamily::query()->create([
                'name' => $name,
                'created_by' => $user->id,
            ]);
            $family->members()->attach($voters->modelKeys(), ['created_by' => $user->id]);

            return $family;
        });

        return redirect()
            ->route('keluarga-pemilih.index', $this->filterRouteParams($validated))
            ->with('success', "{$family->name} berjaya dicipta dengan ".count($validated['pemilih_ids']).' pemilih.');
    }

    public function updateName(Request $request, PemilihFamily $pemilihFamily): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            ...$this->routeFilterRules(),
        ]);
        $family = $this->visibleFamilyQuery($request->user())->findOrFail($pemilihFamily->id);
        $family->update(['name' => trim($validated['name'])]);

        return redirect()
            ->route('keluarga-pemilih.index', $this->filterRouteParams($validated))
            ->with('success', 'Nama keluarga berjaya dikemaskini.');
    }

    public function updateReview(Request $request, PemilihFamily $pemilihFamily): RedirectResponse
    {
        $validated = $request->validate([
            'reviewed' => ['required', 'boolean'],
            ...$this->routeFilterRules(),
        ]);
        $user = $request->user();
        $family = $this->visibleFamilyQuery($user)->findOrFail($pemilihFamily->id);
        $reviewed = filter_var($validated['reviewed'], FILTER_VALIDATE_BOOLEAN);

        $family->update([
            'reviewed_at' => $reviewed ? now() : null,
            'reviewed_by' => $reviewed ? $user->id : null,
        ]);

        $validated['tab'] = $reviewed ? 'reviewed' : 'families';
        $validated['page'] = 1;

        return redirect()
            ->route('keluarga-pemilih.index', $this->filterRouteParams($validated))
            ->with('success', $reviewed ? 'Keluarga disahkan sebagai telah disemak.' : 'Semakan keluarga dibatalkan.');
    }

    public function updateFather(Request $request, PemilihFamily $pemilihFamily): JsonResponse
    {
        $validated = $request->validate([
            'father_id' => ['nullable', 'integer', Rule::exists('pemilih_records', 'id')],
        ]);
        $user = $request->user();
        $family = $this->visibleFamilyQuery($user)->findOrFail($pemilihFamily->id);
        $fatherId = isset($validated['father_id']) ? (int) $validated['father_id'] : null;

        return response()->json($this->setFamilyFather($family, $user, $fatherId));
    }

    private function setFamilyFather(PemilihFamily $family, User $user, ?int $fatherId): array
    {
        $father = null;

        if ($fatherId !== null) {
            $father = PemilihRecord::query()->findOrFail($fatherId);
            if (! $user->canAccessPemilihRecord($father)
                || ! $family->members()->where('pemilih_records.id', $father->id)->exists()) {
                throw ValidationException::withMessages([
                    'father_id' => 'Ayah mesti salah seorang ahli keluarga dalam skop akses anda.',
                ]);
            }
            $fatherNameNormalized = $this->normalize($father->name);
            $fatherParentName = $this->parentName($father->name);
            $hasSameParentName = $family->members()
                ->where('pemilih_records.id', '!=', $father->id)
                ->get(['pemilih_records.id', 'pemilih_records.name'])
                ->contains(fn (PemilihRecord $member): bool => $this->parentName($member->name) === $fatherParentName);

            // BT and BINTI have the same family-name role and cannot identify the father.
            if (! preg_match('/\bBIN\s+/u', $fatherNameNormalized)
                || preg_match('/\b(?:BINTI|BT)\b/u', $fatherNameNormalized)
                || ! $this->isUsefulMatchValue($fatherParentName)
                || $hasSameParentName) {
                throw ValidationException::withMessages([
                    'father_id' => 'Ayah mesti mempunyai Bin dan nama Bin/Binti/BT yang berbeza daripada ahli keluarga lain.',
                ]);
            }
        }

        $familyName = $family->name;
        if ($fatherId !== null) {
            $hasDefaultName = $family->members()
                ->pluck('pemilih_records.name')
                ->contains(fn ($memberName): bool => $familyName === 'Keluarga '.($memberName ?: 'Pemilih'));
            if ($hasDefaultName) {
                $familyName = 'Keluarga '.($father->name ?: 'Pemilih');
            }
        }

        $result = DB::transaction(function () use ($family, $user, $fatherId, $father, $familyName): array {
            $lockedFamily = PemilihFamily::query()->lockForUpdate()->findOrFail($family->id);
            $oldFatherId = $lockedFamily->father_pemilih_record_id
                ? (int) $lockedFamily->father_pemilih_record_id
                : null;
            $removedMemberIds = [];

            if ($oldFatherId !== null && $oldFatherId !== (int) $fatherId) {
                $autoMembers = DB::table('pemilih_family_members')
                    ->where('pemilih_family_id', $lockedFamily->id)
                    ->where('auto_added_by_father_id', $oldFatherId);
                if ($fatherId !== null) {
                    $autoMembers->where('pemilih_record_id', '!=', $fatherId);
                }
                $removedMemberIds = $autoMembers->pluck('pemilih_record_id')->map(fn ($id): int => (int) $id)->all();

                if ($removedMemberIds !== []) {
                    DB::table('pemilih_family_members')->where('pemilih_family_id', $lockedFamily->id)
                        ->whereIn('pemilih_record_id', $removedMemberIds)
                        ->delete();
                }

                if ($fatherId !== null) {
                    DB::table('pemilih_family_members')
                        ->where('pemilih_family_id', $lockedFamily->id)
                        ->where('pemilih_record_id', $fatherId)
                        ->update(['auto_added_by_father_id' => null]);
                }
            }

            $parentName = $father ? $this->personName($father->name) : '';
            $newMemberIds = [];
            if ($fatherId !== null
                && $this->isUsefulMatchValue($parentName)
                && $this->isUsefulMatchValue($this->normalize($father->dm))
                && $this->isUsefulMatchValue($this->normalize($father->locality))) {
                $matchingVoters = $this->activeVoterQuery($user, $father->dm, $father->locality)
                    ->whereDoesntHave('families')
                    ->whereRaw("UPPER(TRIM(COALESCE(name, ''))) LIKE ?", ['%'.$parentName.'%'])
                    ->orderBy('name')
                    ->get()
                    ->filter(fn (PemilihRecord $voter): bool => $this->parentName($voter->name) === $parentName)
                    ->values();

                if ($matchingVoters->count() > 5) {
                    $fatherHouse = $this->normalize($father->no_rumah);
                    $fatherAddress = $this->normalize($this->effectiveAddress($father));

                    $matchingVoters = $matchingVoters->filter(function (PemilihRecord $voter) use ($fatherHouse, $fatherAddress): bool {
                        $voterHouse = $this->normalize($voter->no_rumah);
                        $voterAddress = $this->normalize($this->effectiveAddress($voter));
                        $sameHouse = $this->isUsefulMatchValue($fatherHouse)
                            && $this->isUsefulMatchValue($voterHouse)
                            && $voterHouse === $fatherHouse;
                        $sameAddress = $this->isUsefulMatchValue($fatherAddress)
                            && $this->isUsefulMatchValue($voterAddress)
                            && $voterAddress === $fatherAddress;

                        return $sameHouse || $sameAddress;
                    });
                }

                $newMemberIds = $matchingVoters->modelKeys();
            }

            $voters = $newMemberIds === []
                ? new EloquentCollection
                : $this->lockUnassignedVoters($user, $newMemberIds, $father?->dm, $father?->locality);

            $lockedFamily->update([
                'father_pemilih_record_id' => $fatherId,
                'name' => $familyName,
            ]);
            if ($voters->isNotEmpty()) {
                $lockedFamily->members()->attach($voters->modelKeys(), [
                    'created_by' => $user->id,
                    'auto_added_by_father_id' => $fatherId,
                ]);
            }

            return [
                'added_members' => $voters,
                'removed_member_ids' => $removedMemberIds,
                'member_count' => $lockedFamily->members()->count(),
            ];
        });
        $family->refresh();

        return [
            'father_id' => $fatherId,
            'father_name' => $father?->name,
            'family_name' => $familyName,
            'member_count' => $result['member_count'],
            'added_count' => $result['added_members']->count(),
            'added_members' => $result['added_members']
                ->map(fn (PemilihRecord $voter): array => $this->voterPayload($voter))
                ->values(),
            'removed_count' => count($result['removed_member_ids']),
            'removed_member_ids' => $result['removed_member_ids'],
            'message' => $fatherId === null ? 'Tanda ayah dibuang.' : 'Pemilih ditandakan sebagai ayah keluarga.',
        ];
    }

    public function updateCula(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        $validated = $request->validate([
            'cula_code' => ['required', 'string', Rule::in(collect(CulaCodes::options())->pluck('code')->all())],
        ]);
        $user = $request->user();
        abort_unless($user->canAccessPemilihRecord($pemilihRecord), 404);

        $code = $validated['cula_code'];
        $label = collect(CulaCodes::options())->firstWhere('code', $code)['label'];
        $pemilihRecord->update([
            'cula_code' => $code,
            'cula_display_label' => $label,
        ]);

        CulaWorkItem::query()->firstOrCreate(
            ['pemilih_record_id' => $pemilihRecord->id],
            [
                'marked_by' => $user->id,
                'marked_at' => now(),
                'notes' => null,
            ],
        );

        return response()->json([
            'success' => true,
            'cula_code' => $code,
            'cula_display_label' => $label,
        ]);
    }

    public function addMembers(Request $request, PemilihFamily $pemilihFamily): RedirectResponse
    {
        $validated = $request->validate([
            'pemilih_ids' => ['required', 'array', 'min:1', 'max:30'],
            'pemilih_ids.*' => ['required', 'integer', 'distinct', Rule::exists('pemilih_records', 'id')],
            ...$this->routeFilterRules(),
        ]);
        $user = $request->user();
        $udm = trim((string) ($validated['udm'] ?? ''));
        $locality = trim((string) ($validated['locality'] ?? ''));
        if ($locality !== '' && $udm === '') {
            throw ValidationException::withMessages(['locality' => 'Pilih UDM sebelum memilih lokaliti.']);
        }
        $family = $this->visibleFamilyQuery($user, $udm, $locality)->findOrFail($pemilihFamily->id);

        DB::transaction(function () use ($family, $user, $validated, $udm, $locality): void {
            $voters = $this->lockUnassignedVoters($user, $validated['pemilih_ids'], $udm, $locality);
            $family->members()->attach($voters->modelKeys(), ['created_by' => $user->id]);
        });

        return redirect()
            ->route('keluarga-pemilih.index', $this->filterRouteParams($validated))
            ->with('success', count($validated['pemilih_ids'])." pemilih berjaya ditambah ke {$family->name}.");
    }

    public function removeMember(Request $request, PemilihFamily $pemilihFamily, PemilihRecord $pemilihRecord): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->canAccessPemilihRecord($pemilihRecord), 403);

        $family = $this->visibleFamilyQuery($user)->findOrFail($pemilihFamily->id);
        abort_unless(
            $family->members()->where('pemilih_records.id', $pemilihRecord->id)->exists(),
            404,
        );

        $result = DB::transaction(function () use ($family, $pemilihRecord): array {
            $removedMemberIds = collect([(int) $pemilihRecord->id]);
            if ((int) $family->father_pemilih_record_id === (int) $pemilihRecord->id) {
                $autoMemberIds = DB::table('pemilih_family_members')
                    ->where('pemilih_family_id', $family->id)
                    ->where('auto_added_by_father_id', $pemilihRecord->id)
                    ->pluck('pemilih_record_id');
                if ($autoMemberIds->isNotEmpty()) {
                    $removedMemberIds = $removedMemberIds->merge($autoMemberIds);
                    DB::table('pemilih_family_members')
                        ->where('pemilih_family_id', $family->id)
                        ->whereIn('pemilih_record_id', $autoMemberIds)
                        ->delete();
                }
                $family->update(['father_pemilih_record_id' => null]);
            }

            $family->members()->detach($pemilihRecord->id);
            $memberCount = $family->members()->count();
            $familyDeleted = $memberCount === 0;
            if ($familyDeleted) {
                $family->delete();
            }

            return [
                'removed_member_ids' => $removedMemberIds->map(fn ($id): int => (int) $id)->unique()->values()->all(),
                'removed_active_count' => PemilihRecord::query()
                    ->whereIn('id', $removedMemberIds)
                    ->where('status', 'aktif')
                    ->count(),
                'father_id' => $familyDeleted ? null : $family->father_pemilih_record_id,
                'member_count' => $memberCount,
                'family_deleted' => $familyDeleted,
            ];
        });

        return response()->json([
            'success' => true,
            ...$result,
            'message' => 'Pemilih berjaya dikeluarkan daripada keluarga.',
        ]);
    }

    public function auto(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isMasterAdmin(), 403);

        $validated = $request->validate([
            ...$this->routeFilterRules(),
        ]);
        $udm = trim((string) ($validated['udm'] ?? ''));
        $locality = trim((string) ($validated['locality'] ?? ''));
        if ($locality !== '' && $udm === '') {
            throw ValidationException::withMessages(['locality' => 'Pilih UDM sebelum memilih lokaliti.']);
        }

        $summary = DB::transaction(function () use ($user, $udm, $locality): array {
            $groups = [];
            $query = $this->activeVoterQuery($user, $udm, $locality)
                ->whereDoesntHave('families')
                ->whereNotNull('no_rumah')
                ->where('no_rumah', '!=', '')
                ->whereNotNull('locality')
                ->where('locality', '!=', '')
                ->whereNotNull('dm')
                ->where('dm', '!=', '')
                ->where(function (Builder $builder): void {
                    $builder->whereNotNull('alamat_kediaman')
                        ->where('alamat_kediaman', '!=', '')
                        ->orWhereNotNull('address')
                        ->where('address', '!=', '')
                        ->orWhereNotNull('alamat_kp')
                        ->where('alamat_kp', '!=', '');
                });

            $query->chunkById(1000, function (EloquentCollection $voters) use (&$groups): void {
                foreach ($voters as $voter) {
                    $house = $this->normalize($voter->no_rumah);
                    $address = $this->normalize($this->effectiveAddress($voter));
                    $locality = $this->normalize($voter->locality);
                    $dm = $this->normalize($voter->dm);

                    if (! $this->isUsefulMatchValue($house)
                        || ! $this->isUsefulMatchValue($address)
                        || ! $this->isUsefulMatchValue($locality)
                        || ! $this->isUsefulMatchValue($dm)) {
                        continue;
                    }

                    $key = json_encode([$dm, $locality, $house, $address], JSON_UNESCAPED_UNICODE);
                    $groups[$key]['ids'][] = $voter->id;
                    $groups[$key]['name'] ??= $voter->name;
                }
            });

            $matchedGroups = collect($groups)->filter(fn (array $group): bool => count($group['ids']) > 1);
            $created = 0;
            $membersAdded = 0;

            foreach ($matchedGroups as $group) {
                $voters = $this->lockUnassignedVoters($user, $group['ids'], $udm, $locality);
                if ($voters->count() < 2) {
                    continue;
                }

                $family = PemilihFamily::query()->create([
                    'name' => 'Keluarga '.($group['name'] ?: 'Pemilih'),
                    'created_by' => $user->id,
                ]);
                $family->members()->attach($voters->modelKeys(), ['created_by' => $user->id]);
                $created++;
                $membersAdded += $voters->count();
            }

            return [
                'families' => $created,
                'members' => $membersAdded,
            ];
        });

        $message = $summary['families'] > 0
            ? "Auto selesai: {$summary['families']} keluarga berpadanan kuat dibentuk, melibatkan {$summary['members']} pemilih."
            : 'Tiada kumpulan yang cukup padanan kuat untuk dijadikan keluarga secara automatik.';

        return redirect()
            ->route('keluarga-pemilih.index', $this->filterRouteParams($validated))
            ->with('success', $message);
    }

    public function autoFather(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isMasterAdmin(), 403);

        $validated = $request->validate([
            ...$this->routeFilterRules(),
        ]);
        $udm = trim((string) ($validated['udm'] ?? ''));
        $locality = trim((string) ($validated['locality'] ?? ''));
        if ($locality !== '' && $udm === '') {
            throw ValidationException::withMessages(['locality' => 'Pilih UDM sebelum memilih lokaliti.']);
        }

        $summary = ['marked' => 0, 'members' => 0, 'skipped' => 0];
        $families = $this->visibleFamilyQuery($user, $udm, $locality)
            ->whereNull('father_pemilih_record_id')
            ->with(['members' => function ($query) use ($user, $udm, $locality): void {
                $user->applyScopeToPemilihQuery($query);
                if ($udm !== '') {
                    $query->where('pemilih_records.dm', $udm);
                }
                if ($locality !== '') {
                    $query->where('pemilih_records.locality', $locality);
                }
                $query->orderBy('pemilih_records.name');
            }])
            ->orderBy('id');

        $families->chunkById(100, function (EloquentCollection $familyBatch) use ($user, &$summary): void {
            foreach ($familyBatch as $family) {
                $father = $this->autoFatherCandidate($family->members);
                if (! $father) {
                    continue;
                }

                try {
                    $result = $this->setFamilyFather($family, $user, (int) $father->id);
                    $summary['marked']++;
                    $summary['members'] += $result['added_count'];
                } catch (ValidationException) {
                    $summary['skipped']++;
                }
            }
        });

        $message = $summary['marked'] > 0
            ? "Auto Add Ayah selesai: ayah ditandakan dalam {$summary['marked']} keluarga, {$summary['members']} pemilih ditambah secara automatik.".($summary['skipped'] > 0 ? " {$summary['skipped']} calon tidak lepas validasi ayah." : '')
            : 'Tiada keluarga yang memenuhi corak Auto Add Ayah.';

        return redirect()
            ->route('keluarga-pemilih.index', $this->filterRouteParams($validated))
            ->with('success', $message);
    }

    private function autoFatherCandidate(EloquentCollection $members): ?PemilihRecord
    {
        $members = $members->values();
        $men = $members->filter(fn (PemilihRecord $member): bool => $this->genderCode($member->gender) === 'L')->values();
        $women = $members->filter(fn (PemilihRecord $member): bool => $this->genderCode($member->gender) === 'P')->values();

        if ($members->count() === 2 && $men->count() === 1 && $women->count() === 1) {
            return $men->first();
        }

        $parentNameCounts = $members
            ->map(fn (PemilihRecord $member): string => $this->parentName($member->name))
            ->filter(fn (string $parentName): bool => $this->isUsefulMatchValue($parentName))
            ->countBy();
        if ($parentNameCounts->isEmpty()) {
            return null;
        }

        $mostCommonCount = $parentNameCounts->max();
        if ($mostCommonCount < 2) {
            return null;
        }
        $mostCommonNames = $parentNameCounts->filter(fn (int $count): bool => $count === $mostCommonCount);
        if ($mostCommonNames->count() !== 1) {
            return null;
        }
        $commonParentName = (string) $mostCommonNames->keys()->first();

        $candidates = $men->filter(fn (PemilihRecord $member): bool => $this->personName($member->name) === $commonParentName
            && $this->parentName($member->name) !== $commonParentName)->values();

        return $candidates->count() === 1 ? $candidates->first() : null;
    }

    private function activeVoterQuery(User $user, ?string $udm = null, ?string $locality = null): Builder
    {
        $query = PemilihRecord::query()->where('status', 'aktif');
        $user->applyScopeToPemilihQuery($query);
        if (filled($udm)) {
            $query->where('dm', $udm);
        }
        if (filled($locality)) {
            $query->where('locality', $locality);
        }

        return $query;
    }

    private function activeMalayVoterQuery(User $user, ?string $udm = null, ?string $locality = null): Builder
    {
        return $this->whereMalayRace($this->activeVoterQuery($user, $udm, $locality));
    }

    private function whereMalayRace(Builder|QueryBuilder|Relation $query): Builder|QueryBuilder|Relation
    {
        return $query->whereRaw("UPPER(TRIM(COALESCE(pemilih_records.race, ''))) IN (?, ?)", ['MELAYU', 'M']);
    }

    private function visibleFamilyQuery(User $user, ?string $udm = null, ?string $locality = null): Builder
    {
        return PemilihFamily::query()->whereHas('members', function (Builder $query) use ($user, $udm, $locality): void {
            $user->applyScopeToPemilihQuery($query);
            $this->whereMalayRace($query);
            if (filled($udm)) {
                $query->where('pemilih_records.dm', $udm);
            }
            if (filled($locality)) {
                $query->where('pemilih_records.locality', $locality);
            }
        });
    }

    /** @param array<int, int|string> $ids */
    private function lockUnassignedVoters(User $user, array $ids, ?string $udm = null, ?string $locality = null): EloquentCollection
    {
        $ids = collect($ids)->map(fn ($id): int => (int) $id)->unique()->values();
        $voters = $this->activeVoterQuery($user, $udm, $locality)
            ->whereKey($ids)
            ->whereDoesntHave('families')
            ->lockForUpdate()
            ->get();

        if ($voters->count() !== $ids->count()) {
            throw ValidationException::withMessages([
                'pemilih_ids' => 'Pastikan semua pemilih aktif, masih belum berkeluarga dan berada dalam skop akses anda.',
            ]);
        }

        return $voters;
    }

    private function routeFilterRules(): array
    {
        return [
            'udm' => ['nullable', 'string', 'max:255'],
            'locality' => ['nullable', 'string', 'max:255'],
            'q' => ['nullable', 'string', 'max:100'],
            'cula_codes' => ['nullable', 'array', 'max:40'],
            'cula_codes.*' => ['required', 'string', Rule::in([...array_column(CulaCodes::options(), 'code'), 'belum_dicula'])],
            'cula_code' => $this->culaCodeFilterRule(),
            'tab' => ['nullable', Rule::in(['families', 'unassigned', 'reviewed'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    private function culaCodeFilterRule(): array
    {
        return ['nullable', 'string', Rule::in([...array_column(CulaCodes::options(), 'code'), 'belum_dicula'])];
    }

    private function filterRouteParams(array $validated): array
    {
        $culaCodes = $this->normalizeCulaCodeFilters($validated);

        return array_filter([
            'udm' => filled($validated['udm'] ?? null) ? trim($validated['udm']) : null,
            'locality' => filled($validated['locality'] ?? null) ? trim($validated['locality']) : null,
            'q' => filled($validated['q'] ?? null) ? trim($validated['q']) : null,
            'cula_codes' => $culaCodes !== [] ? $culaCodes : null,
            'tab' => filled($validated['tab'] ?? null) ? $validated['tab'] : null,
            'page' => (int) ($validated['page'] ?? 0) > 1 ? (int) $validated['page'] : null,
        ]);
    }

    /** @return array<int, string> */
    private function normalizeCulaCodeFilters(array $validated): array
    {
        $codes = is_array($validated['cula_codes'] ?? null) ? $validated['cula_codes'] : [];
        if (filled($validated['cula_code'] ?? null)) {
            $codes[] = $validated['cula_code'];
        }

        return collect($codes)
            ->map(fn ($code): string => trim((string) $code))
            ->filter(fn (string $code): bool => $code !== '')
            ->unique()
            ->values()
            ->all();
    }

    private function applySearchTerm(Builder $query, string $term): void
    {
        $columns = ['name', 'no_kp', 'old_ic', 'no_rumah', 'dm', 'locality', 'address', 'alamat_kp', 'alamat_kediaman'];

        foreach ($this->searchTokens($term) as $token) {
            $like = '%'.mb_strtolower($token, 'UTF-8').'%';
            $query->where(function (Builder $builder) use ($columns, $like): void {
                foreach ($columns as $column) {
                    $builder->orWhereRaw("LOWER(COALESCE(pemilih_records.{$column}, '')) LIKE ?", [$like]);
                }
            });
        }
    }

    /** @return array<int, string> */
    private function searchTokens(string $term): array
    {
        $tokens = preg_split('/\s+/u', $this->normalize($term), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_slice(array_values(array_unique($tokens)), 0, 8);
    }

    /** @return array{0: string, 1: array<int, string>} */
    private function searchRelevanceSql(string $term, bool $includeOtherFields = true): array
    {
        $normalizedTerm = mb_strtolower($this->normalize($term), 'UTF-8');
        $nameExpression = "LOWER(TRIM(COALESCE(pemilih_records.name, '')))";
        $parts = [
            "CASE WHEN {$nameExpression} = ? THEN 1000000 ELSE 0 END",
            "CASE WHEN {$nameExpression} LIKE ? THEN 500000 ELSE 0 END",
        ];
        $bindings = [$normalizedTerm, '%'.$normalizedTerm.'%'];
        $otherFields = ['no_kp', 'old_ic', 'no_rumah', 'dm', 'locality', 'address', 'alamat_kp', 'alamat_kediaman'];

        foreach ($this->searchTokens($term) as $token) {
            $like = '%'.mb_strtolower($token, 'UTF-8').'%';
            if (! $includeOtherFields) {
                $parts[] = "CASE WHEN {$nameExpression} LIKE ? THEN 10000 ELSE 0 END";
                $bindings[] = $like;

                continue;
            }

            $otherMatches = collect($otherFields)
                ->map(fn (string $column): string => "LOWER(COALESCE(pemilih_records.{$column}, '')) LIKE ?")
                ->implode(' OR ');
            $parts[] = "CASE WHEN {$nameExpression} LIKE ? THEN 10000 WHEN ({$otherMatches}) THEN 1000 ELSE 0 END";
            array_push($bindings, $like, ...array_fill(0, count($otherFields), $like));
        }

        return ['('.implode(' + ', $parts).')', $bindings];
    }

    private function orderSearchResults(Builder $query, string $term): void
    {
        [$scoreSql, $bindings] = $this->searchRelevanceSql($term);
        $query->orderByRaw($scoreSql.' DESC', $bindings)
            ->orderBy('pemilih_records.name');
    }

    private function searchRelevanceScore(PemilihRecord $voter, string $term): int
    {
        $tokens = $this->searchTokens($term);
        if ($tokens === []) {
            return 0;
        }

        $name = $this->normalize($voter->name);
        $normalizedTerm = $this->normalize($term);
        if ($name === $normalizedTerm) {
            return 1_000_000;
        }

        $phrasePosition = mb_strpos($name, $normalizedTerm, 0, 'UTF-8');
        if ($phrasePosition !== false) {
            return 900_000 - min($phrasePosition, 1_000);
        }

        $namePositions = [];
        foreach ($tokens as $token) {
            $position = mb_strpos($name, $token, 0, 'UTF-8');
            if ($position === false) {
                $namePositions = [];
                break;
            }
            $namePositions[] = $position;
        }

        if (count($namePositions) === count($tokens)) {
            $ordered = true;
            for ($index = 1; $index < count($namePositions); $index++) {
                if ($namePositions[$index] <= $namePositions[$index - 1]) {
                    $ordered = false;
                    break;
                }
            }

            return 800_000 - ((max($namePositions) - min($namePositions)) * 10) - ($ordered ? 0 : 10_000);
        }

        $fields = [
            $name,
            $this->normalize($voter->no_kp),
            $this->normalize($voter->old_ic),
            $this->normalize($voter->no_rumah),
            $this->normalize($voter->dm),
            $this->normalize($voter->locality),
            $this->normalize($voter->address),
            $this->normalize($voter->alamat_kp),
            $this->normalize($voter->alamat_kediaman),
        ];
        $bestFieldMatches = 0;
        foreach ($fields as $field) {
            $fieldMatches = count(array_filter(
                $tokens,
                fn (string $token): bool => mb_strpos($field, $token, 0, 'UTF-8') !== false,
            ));
            $bestFieldMatches = max($bestFieldMatches, $fieldMatches);
        }
        $nameMatches = count(array_filter(
            $tokens,
            fn (string $token): bool => mb_strpos($name, $token, 0, 'UTF-8') !== false,
        ));

        return ($bestFieldMatches * 1_000) + ($nameMatches * 100);
    }

    private function suggestionCandidates(Builder $query, PemilihRecord $anchor, bool $anchorIsFather = false): Collection
    {
        $dm = $this->normalize($anchor->dm);
        $locality = $this->normalize($anchor->locality);
        $house = $this->normalize($anchor->no_rumah);
        $address = $this->normalize($this->effectiveAddress($anchor));
        $parentName = $anchorIsFather ? $this->personName($anchor->name) : $this->parentName($anchor->name);
        $hasStrongSignal = $this->isUsefulMatchValue($house)
            || $this->isUsefulMatchValue($address)
            || $this->isUsefulMatchValue($parentName);

        $records = collect();
        if ($hasStrongSignal) {
            $strong = clone $query;
            $strong->where(function (Builder $builder) use ($dm, $locality, $house, $address, $parentName): void {
                if ($this->isUsefulMatchValue($house) && $this->isUsefulMatchValue($locality) && $this->isUsefulMatchValue($dm)) {
                    $builder->orWhere(function (Builder $match) use ($house, $locality, $dm): void {
                        $match->whereRaw("UPPER(TRIM(COALESCE(no_rumah, ''))) = ?", [$house])
                            ->whereRaw("UPPER(TRIM(COALESCE(locality, ''))) = ?", [$locality])
                            ->whereRaw("UPPER(TRIM(COALESCE(dm, ''))) = ?", [$dm]);
                    });
                }

                if ($this->isUsefulMatchValue($address) && $this->isUsefulMatchValue($locality) && $this->isUsefulMatchValue($dm)) {
                    $builder->orWhere(function (Builder $match) use ($address, $locality, $dm): void {
                        $match->whereRaw($this->effectiveAddressSql().' = ?', [$address])
                            ->whereRaw("UPPER(TRIM(COALESCE(locality, ''))) = ?", [$locality])
                            ->whereRaw("UPPER(TRIM(COALESCE(dm, ''))) = ?", [$dm]);
                    });
                }

                if ($this->isUsefulMatchValue($parentName) && $this->isUsefulMatchValue($locality) && $this->isUsefulMatchValue($dm)) {
                    $builder->orWhere(function (Builder $match) use ($parentName, $locality, $dm): void {
                        $match->whereRaw("UPPER(TRIM(COALESCE(name, ''))) LIKE ?", ['%'.$parentName.'%'])
                            ->whereRaw("UPPER(TRIM(COALESCE(locality, ''))) = ?", [$locality])
                            ->whereRaw("UPPER(TRIM(COALESCE(dm, ''))) = ?", [$dm]);
                    });
                }
            });

            $records = $strong->orderBy('no_rumah')->orderBy('name')->limit(100)->get();
        }

        if ($this->isUsefulMatchValue($locality) && $this->isUsefulMatchValue($dm)) {
            $nearby = clone $query;
            $nearby->whereRaw("UPPER(TRIM(COALESCE(locality, ''))) = ?", [$locality])
                ->whereRaw("UPPER(TRIM(COALESCE(dm, ''))) = ?", [$dm]);

            $records = $records
                ->concat($nearby->orderBy('no_rumah')->orderBy('name')->limit(80)->get())
                ->unique('id')
                ->values();
        }

        return $records;
    }

    private function matchDetails(PemilihRecord $anchor, PemilihRecord $voter, bool $anchorIsFather = false): array
    {
        $sameDm = $this->normalize($anchor->dm) !== ''
            && $this->normalize($anchor->dm) === $this->normalize($voter->dm);
        $sameLocality = $sameDm
            && $this->normalize($anchor->locality) !== ''
            && $this->normalize($anchor->locality) === $this->normalize($voter->locality);
        $sameHouse = $sameLocality
            && $this->isUsefulMatchValue($this->normalize($anchor->no_rumah))
            && $this->normalize($anchor->no_rumah) === $this->normalize($voter->no_rumah);
        $sameAddress = $sameLocality
            && $this->isUsefulMatchValue($this->normalize($this->effectiveAddress($anchor)))
            && $this->normalize($this->effectiveAddress($anchor)) === $this->normalize($this->effectiveAddress($voter));
        $anchorParent = $anchorIsFather ? $this->personName($anchor->name) : $this->parentName($anchor->name);
        $sameParent = $sameLocality
            && $this->isUsefulMatchValue($anchorParent)
            && $anchorParent === $this->parentName($voter->name);

        $reasons = [];
        if ($sameHouse) {
            $reasons[] = 'No. rumah sama';
        }
        if ($sameAddress) {
            $reasons[] = 'Alamat sama';
        }
        if ($sameParent) {
            $reasons[] = 'Bin/Binti/BT sama';
        }
        if ($sameLocality) {
            $reasons[] = 'Lokaliti sama';
        }

        $score = match (true) {
            $sameHouse && $sameAddress => 100,
            $sameHouse => 85,
            $sameAddress => 80,
            $sameParent => 70,
            $sameLocality => 20,
            $sameDm => 10,
            default => 0,
        };

        return ['match_score' => $score, 'match_reasons' => $reasons];
    }

    private function voterPayload(PemilihRecord $voter, ?array $match = null): array
    {
        return [
            'id' => $voter->id,
            'name' => $voter->name,
            'gender' => $voter->gender,
            'avatar_url' => $voter->avatarUrl(),
            'no_kp' => $voter->no_kp,
            'old_ic' => $voter->old_ic,
            'status' => $voter->status,
            'cula_code' => $voter->cula_code,
            'cula_display_label' => $voter->cula_display_label,
            'catatan' => $voter->catatan,
            'dm' => $voter->dm,
            'locality' => $voter->locality,
            'no_rumah' => $voter->no_rumah,
            'address' => $this->effectiveAddress($voter),
            'phone_mobile' => $voter->phone_mobile,
            'match_score' => $match['match_score'] ?? 0,
            'match_reasons' => $match['match_reasons'] ?? [],
        ];
    }

    private function effectiveAddress(PemilihRecord $voter): ?string
    {
        foreach ([$voter->alamat_kediaman, $voter->address, $voter->alamat_kp] as $address) {
            if (filled($address)) {
                return trim((string) $address);
            }
        }

        return null;
    }

    private function effectiveAddressSql(): string
    {
        return "UPPER(TRIM(COALESCE(NULLIF(TRIM(alamat_kediaman), ''), NULLIF(TRIM(address), ''), NULLIF(TRIM(alamat_kp), ''))))";
    }

    private function parentName(?string $name): string
    {
        $normalized = $this->normalize($name);
        if ($normalized === '' || ! preg_match('/\b(?:BIN(?:TI)?|BT)\s+(.+)$/u', $normalized, $matches)) {
            return '';
        }

        return trim($matches[1]);
    }

    private function parentNameSql(): string
    {
        $name = "UPPER(TRIM(COALESCE(pemilih_records.name, '')))";
        $cases = [];

        foreach (['BINTI', 'BT', 'BIN'] as $marker) {
            $markerPosition = "INSTR({$name}, ' {$marker} ')";
            $parentStart = strlen($marker) + 2;
            $cases[] = "WHEN {$markerPosition} > 0 THEN TRIM(SUBSTR({$name}, {$markerPosition} + {$parentStart}))";
            $cases[] = "WHEN {$name} LIKE '{$marker} %' THEN TRIM(SUBSTR({$name}, {$parentStart}))";
        }

        return 'CASE '.implode(' ', $cases)." ELSE '' END";
    }

    private function personName(?string $name): string
    {
        $normalized = $this->normalize($name);
        if ($normalized === '' || ! preg_match('/\b(?:BIN(?:TI)?|BT)\b/u', $normalized, $matches, PREG_OFFSET_CAPTURE)) {
            return $normalized;
        }

        return trim(substr($normalized, 0, $matches[0][1]));
    }

    private function normalize(?string $value): string
    {
        return mb_strtoupper(preg_replace('/\s+/u', ' ', trim((string) $value)) ?? '', 'UTF-8');
    }

    private function genderCode(?string $gender): string
    {
        return match ($this->normalize($gender)) {
            'L', 'LELAKI', 'MALE' => 'L',
            'P', 'PEREMPUAN', 'FEMALE' => 'P',
            default => '',
        };
    }

    private function isUsefulMatchValue(string $value): bool
    {
        return $value !== '' && ! in_array($value, ['-', 'N/A', 'NA', 'TIADA', 'NULL'], true);
    }
}
