<?php

namespace App\Http\Controllers;

use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
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
    public function index(Request $request): Response
    {
        $user = $request->user();
        $votersByUdm = $this->activeVoterQuery($user)
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
        $udmFilter = $votersByUdm->has($requestedUdm) ? $requestedUdm : '';

        $voters = $this->activeVoterQuery($user);
        if ($udmFilter !== '') {
            $voters->where('dm', $udmFilter);
        }
        $familiesQuery = $this->visibleFamilyQuery($user, $udmFilter);
        $allVoters = $this->activeVoterQuery($user);
        $allFamiliesQuery = $this->visibleFamilyQuery($user);

        $familyCountsByUdmQuery = DB::table('pemilih_family_members')
            ->join('pemilih_records', 'pemilih_records.id', '=', 'pemilih_family_members.pemilih_record_id')
            ->whereNotNull('pemilih_records.dm')
            ->where('pemilih_records.dm', '!=', '')
            ->select('pemilih_records.dm')
            ->selectRaw('COUNT(DISTINCT pemilih_family_members.pemilih_family_id) as family_count')
            ->groupBy('pemilih_records.dm');
        $user->applyScopeToPemilihQuery($familyCountsByUdmQuery);
        $familyCountsByUdm = $familyCountsByUdmQuery->pluck('family_count', 'dm');
        $udmSummaries = $votersByUdm->map(fn ($summary, string $udm): array => [
            'udm' => $udm,
            'families' => (int) ($familyCountsByUdm[$udm] ?? 0),
            'voters' => (int) $summary->voter_count,
            'assigned' => (int) $summary->assigned_count,
            'unassigned' => (int) $summary->voter_count - (int) $summary->assigned_count,
        ])->values();

        $families = (clone $familiesQuery)
            ->with([
                'father' => function ($query) use ($user, $udmFilter): void {
                    $user->applyScopeToPemilihQuery($query);
                    if ($udmFilter !== '') {
                        $query->where('pemilih_records.dm', $udmFilter);
                    }
                },
                'members' => function ($query) use ($user, $udmFilter): void {
                    $user->applyScopeToPemilihQuery($query);
                    if ($udmFilter !== '') {
                        $query->where('pemilih_records.dm', $udmFilter);
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
                'created_at' => $family->created_at,
                'members' => $family->members->map(fn (PemilihRecord $voter): array => $this->voterPayload($voter)),
                'member_count' => $family->members->count(),
            ]);

        return Inertia::render('KeluargaPemilih/Index', [
            'families' => $families,
            'filters' => ['udm' => $udmFilter],
            'udmSummaries' => $udmSummaries,
            'allStats' => [
                'families' => (clone $allFamiliesQuery)->count(),
                'voters' => (clone $allVoters)->count(),
                'assigned' => (clone $allVoters)->whereHas('families')->count(),
                'unassigned' => (clone $allVoters)->whereDoesntHave('families')->count(),
            ],
            'stats' => [
                'families' => (clone $familiesQuery)->count(),
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
        ]);
        $user = $request->user();
        $term = trim((string) ($validated['q'] ?? ''));
        $anchorIsFather = (bool) ($validated['anchor_as_father'] ?? false);
        $anchor = null;

        if (! empty($validated['anchor_id'])) {
            $anchor = $this->activeVoterQuery($user)->findOrFail($validated['anchor_id']);
        }

        $query = $this->activeVoterQuery($user)->whereDoesntHave('families');
        if ($anchor) {
            $query->where('pemilih_records.id', '!=', $anchor->id);
        }

        if ($term !== '') {
            $this->applySearchTerm($query, $term);
            $records = $query
                ->orderBy('no_rumah')
                ->orderBy('locality')
                ->orderBy('name')
                ->limit(100)
                ->get();
        } elseif ($anchor) {
            $records = $this->suggestionCandidates($query, $anchor, $anchorIsFather);
        } else {
            $records = collect();
        }

        $results = $records
            ->map(fn (PemilihRecord $voter): array => $this->voterPayload(
                $voter,
                $anchor ? $this->matchDetails($anchor, $voter, $anchorIsFather) : null,
            ))
            ->sort(function (array $left, array $right): int {
                return ($right['match_score'] <=> $left['match_score'])
                    ?: strcasecmp((string) $left['name'], (string) $right['name']);
            })
            ->take(80)
            ->values();

        return response()->json(['voters' => $results]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'pemilih_ids' => ['required', 'array', 'min:1', 'max:30'],
            'pemilih_ids.*' => ['required', 'integer', 'distinct', Rule::exists('pemilih_records', 'id')],
        ]);
        $user = $request->user();

        $family = DB::transaction(function () use ($validated, $user): PemilihFamily {
            $voters = $this->lockUnassignedVoters($user, $validated['pemilih_ids']);
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
            ->route('keluarga-pemilih.index')
            ->with('success', "{$family->name} berjaya dicipta dengan ".count($validated['pemilih_ids']).' pemilih.');
    }

    public function updateName(Request $request, PemilihFamily $pemilihFamily): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);
        $family = $this->visibleFamilyQuery($request->user())->findOrFail($pemilihFamily->id);
        $family->update(['name' => trim($validated['name'])]);

        return redirect()
            ->route('keluarga-pemilih.index')
            ->with('success', 'Nama keluarga berjaya dikemaskini.');
    }

    public function updateFather(Request $request, PemilihFamily $pemilihFamily): RedirectResponse
    {
        $validated = $request->validate([
            'father_id' => ['nullable', 'integer', Rule::exists('pemilih_records', 'id')],
        ]);
        $user = $request->user();
        $family = $this->visibleFamilyQuery($user)->findOrFail($pemilihFamily->id);
        $fatherId = $validated['father_id'] ?? null;

        if ($fatherId !== null) {
            $father = PemilihRecord::query()->findOrFail($fatherId);
            if (! $user->canAccessPemilihRecord($father)
                || ! $family->members()->where('pemilih_records.id', $father->id)->exists()) {
                throw ValidationException::withMessages([
                    'father_id' => 'Ayah mesti salah seorang ahli keluarga dalam skop akses anda.',
                ]);
            }
        }

        $family->update(['father_pemilih_record_id' => $fatherId]);

        return redirect()
            ->route('keluarga-pemilih.index')
            ->with('success', $fatherId === null ? 'Tanda ayah dibuang.' : 'Pemilih ditandakan sebagai ayah keluarga.');
    }

    public function addMembers(Request $request, PemilihFamily $pemilihFamily): RedirectResponse
    {
        $validated = $request->validate([
            'pemilih_ids' => ['required', 'array', 'min:1', 'max:30'],
            'pemilih_ids.*' => ['required', 'integer', 'distinct', Rule::exists('pemilih_records', 'id')],
        ]);
        $user = $request->user();
        $family = $this->visibleFamilyQuery($user)->findOrFail($pemilihFamily->id);

        DB::transaction(function () use ($family, $user, $validated): void {
            $voters = $this->lockUnassignedVoters($user, $validated['pemilih_ids']);
            $family->members()->attach($voters->modelKeys(), ['created_by' => $user->id]);
        });

        return redirect()
            ->route('keluarga-pemilih.index')
            ->with('success', count($validated['pemilih_ids'])." pemilih berjaya ditambah ke {$family->name}.");
    }

    public function removeMember(Request $request, PemilihFamily $pemilihFamily, PemilihRecord $pemilihRecord): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->canAccessPemilihRecord($pemilihRecord), 403);

        $family = $this->visibleFamilyQuery($user)->findOrFail($pemilihFamily->id);
        abort_unless(
            $family->members()->where('pemilih_records.id', $pemilihRecord->id)->exists(),
            404,
        );

        DB::transaction(function () use ($family, $pemilihRecord): void {
            if ((int) $family->father_pemilih_record_id === (int) $pemilihRecord->id) {
                $family->update(['father_pemilih_record_id' => null]);
            }

            $family->members()->detach($pemilihRecord->id);
            if (! $family->members()->exists()) {
                $family->delete();
            }
        });

        return redirect()
            ->route('keluarga-pemilih.index')
            ->with('success', 'Pemilih berjaya dikeluarkan daripada keluarga.');
    }

    public function auto(Request $request): RedirectResponse
    {
        $user = $request->user();

        $summary = DB::transaction(function () use ($user): array {
            $groups = [];
            $query = $this->activeVoterQuery($user)
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
                $voters = $this->lockUnassignedVoters($user, $group['ids']);
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

        return redirect()->route('keluarga-pemilih.index')->with('success', $message);
    }

    private function activeVoterQuery(User $user): Builder
    {
        $query = PemilihRecord::query()->where('status', 'aktif');
        $user->applyScopeToPemilihQuery($query);

        return $query;
    }

    private function visibleFamilyQuery(User $user, ?string $udm = null): Builder
    {
        return PemilihFamily::query()->whereHas('members', function (Builder $query) use ($user, $udm): void {
            $user->applyScopeToPemilihQuery($query);
            if (filled($udm)) {
                $query->where('pemilih_records.dm', $udm);
            }
        });
    }

    /** @param array<int, int|string> $ids */
    private function lockUnassignedVoters(User $user, array $ids): EloquentCollection
    {
        $ids = collect($ids)->map(fn ($id): int => (int) $id)->unique()->values();
        $voters = $this->activeVoterQuery($user)
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

    private function applySearchTerm(Builder $query, string $term): void
    {
        $like = '%'.mb_strtolower($term).'%';
        $query->where(function (Builder $builder) use ($like): void {
            foreach (['name', 'no_kp', 'old_ic', 'no_rumah', 'dm', 'locality', 'address', 'alamat_kp', 'alamat_kediaman'] as $column) {
                $builder->orWhereRaw("LOWER(COALESCE({$column}, '')) LIKE ?", [$like]);
            }
        });
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
            $reasons[] = 'Bin/Binti sama';
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
            'no_kp' => $voter->no_kp,
            'old_ic' => $voter->old_ic,
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
        if ($normalized === '' || ! preg_match('/\bBIN(?:TI)?\s+(.+)$/u', $normalized, $matches)) {
            return '';
        }

        return trim($matches[1]);
    }

    private function personName(?string $name): string
    {
        $normalized = $this->normalize($name);
        if ($normalized === '' || ! preg_match('/\bBIN(?:TI)?\b/u', $normalized, $matches, PREG_OFFSET_CAPTURE)) {
            return $normalized;
        }

        return trim(substr($normalized, 0, $matches[0][1]));
    }

    private function normalize(?string $value): string
    {
        return mb_strtoupper(preg_replace('/\s+/u', ' ', trim((string) $value)) ?? '', 'UTF-8');
    }

    private function isUsefulMatchValue(string $value): bool
    {
        return $value !== '' && ! in_array($value, ['-', 'N/A', 'NA', 'TIADA', 'NULL'], true);
    }
}
