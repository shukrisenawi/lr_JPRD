<?php

namespace App\Http\Controllers;

use App\Models\CommitteeMembership;
use App\Models\KadTen;
use App\Models\KadTenMember;
use App\Models\PemilihRecord;
use App\Models\User;
use App\Support\CulaCodes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class KadTenController extends Controller
{
    private const ALLOWED_CULA_CODES = ['2', '3B', '3D', '3K', '3M', '3P', '3U'];

    private const MINIMUM_MEMBERS = 10;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $udmFilter = trim((string) $request->query('udm', ''));

        $kadsQuery = KadTen::query()
            ->with(['pemimpin', 'committeeMembership.position', 'members.voter', 'creator'])
            ->kadTenForUser($user);
        if ($udmFilter !== '') {
            $kadsQuery->where(function (Builder $builder) use ($udmFilter): void {
                $builder->where(function (Builder $query) use ($udmFilter): void {
                    $query->where('level', 'udm')->where('scope_key', $udmFilter);
                })->orWhere(function (Builder $query) use ($udmFilter): void {
                    $query->where('level', 'cawangan')
                        ->where(function (Builder $scopeQuery) use ($udmFilter): void {
                            $scopeQuery->where('parent_scope_name', $udmFilter)
                                ->orWhere('scope_key', 'like', $udmFilter.'|%');
                        });
                });
            });
        }

        $kads = $kadsQuery
            ->latest()
            ->get()
            ->map(fn (KadTen $kad) => [
                'id' => $kad->id,
                'name' => $kad->name,
                'committee_membership_id' => $kad->committee_membership_id,
                'pemimpin' => $kad->pemimpin ? [
                    'id' => $kad->pemimpin->id,
                    'name' => $kad->pemimpin->name,
                    'no_kp' => $kad->pemimpin->no_kp,
                    'old_ic' => $kad->pemimpin->old_ic,
                    'dm' => $kad->pemimpin->dm,
                    'locality' => $kad->pemimpin->locality,
                    'avatar_url' => $kad->pemimpin->avatarUrl(),
                    'phone_mobile' => $kad->pemimpin->phone_mobile,
                    'position_name' => $kad->committeeMembership?->position?->name,
                ] : null,
                'level' => $kad->level,
                'scope_key' => $kad->scope_key,
                'scope_name' => $kad->scope_name,
                'parent_scope_name' => $kad->parent_scope_name,
                'notes' => $kad->notes,
                'creator_name' => $kad->creator?->name,
                'members' => $kad->members->map(fn (KadTenMember $member) => [
                    'id' => $member->id,
                    'pemilih_record_id' => $member->pemilih_record_id,
                    'cluster_type' => $member->cluster_type,
                    'cluster_value' => $member->cluster_value,
                    'match_score' => $member->match_score,
                    'match_reason' => $member->match_reason,
                    'voter' => $member->voter ? [
                        'id' => $member->voter->id,
                        'name' => $member->voter->name,
                        'no_kp' => $member->voter->no_kp,
                        'old_ic' => $member->voter->old_ic,
                        'dm' => $member->voter->dm,
                        'locality' => $member->voter->locality,
                        'no_rumah' => $member->voter->no_rumah,
                        'address' => $member->voter->address,
                        'alamat_kp' => $member->voter->alamat_kp,
                        'alamat_kediaman' => $member->voter->alamat_kediaman,
                        'phone_mobile' => $member->voter->phone_mobile,
                        'phone_home' => $member->voter->phone_home,
                        'cula_code' => $member->voter->cula_code,
                        'cula_display_label' => $member->voter->cula_display_label,
                        'avatar_url' => $member->voter->avatarUrl(),
                    ] : null,
                ])->values(),
                'member_count' => $kad->members->count(),
                'minimum_members' => self::MINIMUM_MEMBERS,
                'is_complete' => $kad->members->count() >= self::MINIMUM_MEMBERS,
                'created_at' => $kad->created_at,
            ])
            ->values();

        $udmQuery = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereNotNull('dm')
            ->where('dm', '!=', '');
        $scope = $user->accessScope();
        if ($scope !== null && filled($scope['dm'])) {
            $udmQuery->where('dm', $scope['dm']);
        }

        $cawanganQuery = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->whereNotNull('locality')
            ->where('locality', '!=', '');
        if ($scope !== null && filled($scope['dm'])) {
            $cawanganQuery->where('dm', $scope['dm']);
        }
        if ($scope !== null && filled($scope['locality'])) {
            $cawanganQuery->where('locality', $scope['locality']);
        }

        return Inertia::render('KadTen/Index', [
            'kads' => $kads,
            'filters' => ['udm' => $udmFilter],
            'scopes' => [
                'jprd' => [
                    ['key' => 'jprd', 'name' => 'JPRD', 'parent_scope_name' => null],
                ],
                'udm' => $udmQuery
                    ->select('dm')
                    ->distinct()
                    ->orderBy('dm')
                    ->get()
                    ->map(fn (PemilihRecord $record) => [
                        'key' => $record->dm,
                        'name' => $record->dm,
                        'parent_scope_name' => null,
                    ])
                    ->values(),
                'cawangan' => $cawanganQuery
                    ->select('dm', 'locality')
                    ->distinct()
                    ->orderBy('dm')
                    ->orderBy('locality')
                    ->get()
                    ->map(fn (PemilihRecord $record) => [
                        'key' => $record->dm.'|'.$record->locality,
                        'name' => $record->locality,
                        'parent_scope_name' => $record->dm,
                    ])
                    ->values(),
            ],
            'can_manage' => $this->isManager($user),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->ensureManager($request->user());

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'committee_membership_id' => ['required', 'integer', Rule::exists('committee_memberships', 'id')],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $membership = $this->managerMembership($request->user(), $validated['committee_membership_id']);
        if (! $membership) {
            return back()->withErrors(['committee_membership_id' => 'AJK ini bukan dalam skop UDM anda.']);
        }

        $voter = $membership->voter;
        if ($voter->status !== 'aktif') {
            return back()->withErrors(['committee_membership_id' => 'Hanya pemilih aktif boleh dilantik sebagai ketua.']);
        }

        if (KadTen::query()->where('pemimpin_id', $voter->id)->exists()) {
            return back()->withErrors(['committee_membership_id' => 'AJK ini sudah mempunyai Kad 10.']);
        }

        [$scopeName, $parentScopeName] = $this->resolveScope($membership->level, $membership->scope_key, $voter);

        KadTen::query()->create([
            'name' => $validated['name'] ?? null,
            'pemimpin_id' => $voter->id,
            'committee_membership_id' => $membership->id,
            'level' => $membership->level,
            'scope_key' => $membership->scope_key,
            'scope_name' => $scopeName,
            'parent_scope_name' => $parentScopeName,
            'created_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()
            ->route('kad-ten.index')
            ->with('success', 'Kad 10 berjaya dicipta.');
    }

    public function update(Request $request, KadTen $kadTen): RedirectResponse
    {
        $this->ensureCanManage($request->user(), $kadTen);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'committee_membership_id' => ['required', 'integer', Rule::exists('committee_memberships', 'id')],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $membership = $this->managerMembership($request->user(), $validated['committee_membership_id']);
        if (! $membership) {
            return back()->withErrors(['committee_membership_id' => 'AJK ini bukan dalam skop UDM anda.']);
        }

        $voter = $membership->voter;
        if ($voter->status !== 'aktif') {
            return back()->withErrors(['committee_membership_id' => 'Hanya pemilih aktif boleh dilantik sebagai ketua.']);
        }

        $leaderTaken = KadTen::query()
            ->where('pemimpin_id', $voter->id)
            ->where('id', '!=', $kadTen->id)
            ->exists();

        if ($leaderTaken) {
            return back()->withErrors(['committee_membership_id' => 'AJK ini sudah mempunyai Kad 10.']);
        }

        if ($this->hasMembersOutsideScope($kadTen, $membership)) {
            return back()->withErrors([
                'committee_membership_id' => 'Skop ketua baharu tidak sepadan dengan ahli sedia ada. Buang atau pindahkan ahli dahulu.',
            ]);
        }

        [$scopeName, $parentScopeName] = $this->resolveScope($membership->level, $membership->scope_key, $voter);

        $kadTen->update([
            'name' => $validated['name'] ?? $kadTen->name,
            'pemimpin_id' => $voter->id,
            'committee_membership_id' => $membership->id,
            'level' => $membership->level,
            'scope_key' => $membership->scope_key,
            'scope_name' => $scopeName,
            'parent_scope_name' => $parentScopeName,
            'notes' => $validated['notes'] ?? $kadTen->notes,
        ]);

        if ($kadTen->wasChanged(['pemimpin_id', 'committee_membership_id', 'level', 'scope_key'])) {
            $kadTen->load(['pemimpin', 'members.voter']);
            foreach ($kadTen->members as $member) {
                if (! $member->voter) {
                    continue;
                }

                $match = $this->matchDetails($kadTen->pemimpin, $member->voter);
                $member->update([
                    'match_score' => $match['score'],
                    'match_reason' => implode(', ', $match['reasons']),
                ]);
            }
        }

        return redirect()
            ->route('kad-ten.index')
            ->with('success', 'Kad 10 berjaya dikemaskini.');
    }

    public function destroy(Request $request, KadTen $kadTen): RedirectResponse
    {
        $this->ensureCanManage($request->user(), $kadTen);
        $kadTen->delete();

        return redirect()
            ->route('kad-ten.index')
            ->with('success', 'Kad 10 berjaya dipadam.');
    }

    public function storeMember(Request $request, KadTen $kadTen): RedirectResponse|JsonResponse
    {
        $this->ensureCanManage($request->user(), $kadTen);

        $validated = $request->validate([
            'pemilih_record_ids' => ['required', 'array', 'max:500'],
            'pemilih_record_ids.*' => ['required', 'integer', Rule::exists('pemilih_records', 'id')],
            'cluster_type' => ['nullable', Rule::in(['alamat', 'no_rumah', 'localiti', 'manual'])],
        ]);

        $kadTen->loadMissing('pemimpin');
        $inserted = 0;
        $skipped = [];

        DB::transaction(function () use ($validated, $request, $kadTen, &$inserted, &$skipped): void {
            $votersQuery = $this->eligibleVoterBaseQuery()
                ->whereIn('id', $validated['pemilih_record_ids'])
                ->lockForUpdate();
            $this->applyKadScopeToVoterQuery($votersQuery, $kadTen);
            $voters = $votersQuery->get()->keyBy('id');

            foreach ($validated['pemilih_record_ids'] as $id) {
                $voter = $voters->get($id);
                if (! $voter) {
                    continue;
                }

                if ($voter->id === $kadTen->pemimpin_id || KadTenMember::query()->where('pemilih_record_id', $id)->exists()) {
                    $skipped[] = $voter->name;

                    continue;
                }

                $match = $this->matchDetails($kadTen->pemimpin, $voter);
                $clusterType = ($validated['cluster_type'] ?? null) === 'manual'
                    ? 'manual'
                    : $match['type'];
                $now = now();

                $created = KadTenMember::query()->insertOrIgnore([
                    'kad_ten_id' => $kadTen->id,
                    'pemilih_record_id' => $id,
                    'cluster_type' => $clusterType,
                    'cluster_value' => $this->clusterValue($clusterType, $voter),
                    'match_score' => $match['score'],
                    'match_reason' => implode(', ', $match['reasons']),
                    'created_by' => $request->user()->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                if ($created === 1) {
                    $inserted++;
                } else {
                    $skipped[] = $voter->name;
                }
            }
        });

        $message = $inserted > 0 ? "$inserted ahli berjaya ditambah." : 'Tiada ahli baru ditambah.';
        if ($skipped !== []) {
            $message .= ' ('.count($skipped).' sudah diagihkan: '.implode(', ', array_slice($skipped, 0, 3)).')';
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'inserted' => $inserted,
                'skipped' => count($skipped),
            ]);
        }

        return redirect()
            ->route('kad-ten.index')
            ->with('success', $message);
    }

    public function destroyMember(Request $request, KadTen $kadTen, KadTenMember $member): RedirectResponse|JsonResponse
    {
        $this->ensureCanManage($request->user(), $kadTen);

        $member = $kadTen->members()->whereKey($member->id)->firstOrFail();
        $member->delete();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Ahli berjaya dibuang.']);
        }

        return redirect()
            ->route('kad-ten.index')
            ->with('success', 'Ahli berjaya dibuang.');
    }

    public function searchPemilih(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        if (mb_strlen($query) < 2) {
            return response()->json(['suggestions' => []]);
        }

        $kad = null;
        if ($request->filled('kad_ten_id')) {
            $kad = KadTen::query()->findOrFail($request->integer('kad_ten_id'));
            $this->ensureCanManage($request->user(), $kad);
        }

        $builder = $kad
            ? $this->eligibleVoterQueryForKad($kad)
            : $this->eligibleVoterQueryForUser($request->user());
        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($query)) ?: []));

        $builder->where(function (Builder $subQuery) use ($keywords): void {
            foreach ($keywords as $keyword) {
                $like = '%'.$keyword.'%';
                $subQuery->where(function (Builder $q) use ($keyword, $like): void {
                    $q->whereRaw('LOWER(name) like ?', [$like])
                        ->orWhereRaw('LOWER(dm) like ?', [$like])
                        ->orWhereRaw('LOWER(locality) like ?', [$like])
                        ->orWhereRaw('LOWER(no_rumah) like ?', [$like])
                        ->orWhereRaw('LOWER(address) like ?', [$like])
                        ->orWhereRaw('LOWER(alamat_kp) like ?', [$like])
                        ->orWhereRaw('LOWER(alamat_kediaman) like ?', [$like]);

                    if (preg_match('/\d/', $keyword)) {
                        $digitLike = '%'.preg_replace('/\D+/', '', $keyword).'%';
                        $q->orWhere('no_kp', 'like', $digitLike)
                            ->orWhere('old_ic', 'like', $digitLike)
                            ->orWhere('phone_home', 'like', $digitLike)
                            ->orWhere('phone_mobile', 'like', $digitLike);
                    }
                });
            }
        });

        $records = $builder
            ->orderBy('name')
            ->limit($kad ? 300 : 8)
            ->get();

        if ($kad) {
            return response()->json([
                'suggestions' => $this->rankVoters($records, $kad->pemimpin, 8),
            ]);
        }

        return response()->json([
            'suggestions' => $records->map(fn (PemilihRecord $record) => $this->transformVoter($record))->values(),
        ]);
    }

    public function suggestPemimpin(Request $request): JsonResponse
    {
        if (! $this->isManager($request->user())) {
            return response()->json(['suggestions' => []]);
        }

        $query = trim((string) $request->query('q', ''));
        $level = $request->query('level');
        $membershipsQuery = CommitteeMembership::query()
            ->with(['voter', 'position'])
            ->whereIn('level', ['udm', 'cawangan'])
            ->whereHas('voter', fn (Builder $builder) => $builder->where('status', 'aktif'));

        $this->applyManagerScopeToMembershipQuery($membershipsQuery, $request->user());

        if (in_array($level, ['udm', 'cawangan'], true)) {
            $membershipsQuery->where('level', $level);
        }

        if (mb_strlen($query) >= 2) {
            $like = '%'.$query.'%';
            $membershipsQuery->whereHas('voter', function (Builder $builder) use ($like): void {
                $builder->where(function (Builder $subQuery) use ($like): void {
                    $subQuery->whereRaw('LOWER(name) like ?', [$like])
                        ->orWhere('no_kp', 'like', $like)
                        ->orWhere('old_ic', 'like', $like)
                        ->orWhereRaw('LOWER(locality) like ?', [$like]);
                });
            });
        }

        $results = $membershipsQuery
            ->orderBy('level')
            ->orderBy('scope_name')
            ->limit(20)
            ->get()
            ->map(fn (CommitteeMembership $membership) => [
                'membership_id' => $membership->id,
                'pemilih_id' => $membership->voter?->id,
                'id' => $membership->voter?->id,
                'name' => $membership->voter?->name,
                'no_kp' => $membership->voter?->no_kp,
                'old_ic' => $membership->voter?->old_ic,
                'dm' => $membership->voter?->dm,
                'locality' => $membership->voter?->locality,
                'position_name' => $membership->position?->name,
                'level' => $membership->level,
                'scope_name' => $membership->scope_name,
                'scope_key' => $membership->scope_key,
                'parent_scope_name' => $membership->parent_scope_name,
                'avatar_url' => $membership->voter?->avatarUrl(),
                'phone_mobile' => $membership->voter?->phone_mobile,
            ])
            ->values();

        return response()->json(['suggestions' => $results]);
    }

    public function recommendations(Request $request, KadTen $kadTen): JsonResponse
    {
        $this->ensureCanManage($request->user(), $kadTen);
        $kadTen->loadMissing('pemimpin');

        $records = $this->eligibleVoterQueryForKad($kadTen)
            ->orderBy('locality')
            ->orderBy('name')
            ->limit(300)
            ->get();

        return response()->json([
            'recommendations' => $this->rankVoters($records, $kadTen->pemimpin, 20),
            'minimum_members' => self::MINIMUM_MEMBERS,
        ]);
    }

    public function clustersFor(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        $kad = null;
        if ($request->filled('kad_ten_id')) {
            $kad = KadTen::query()->findOrFail($request->integer('kad_ten_id'));
            $this->ensureCanManage($request->user(), $kad);
        } else {
            $this->ensureManager($request->user());
        }

        $builder = $kad
            ? $this->eligibleVoterQueryForKad($kad)
            : $this->eligibleVoterQueryForUser($request->user());
        $records = $builder->where('id', '!=', $pemilihRecord->id)->get();
        $address = $this->normalizedValue($this->effectiveAddress($pemilihRecord));
        $house = $this->normalizedValue($pemilihRecord->no_rumah);
        $locality = $this->normalizedValue($pemilihRecord->locality);

        $byAddress = $records
            ->filter(fn (PemilihRecord $record) => $address !== '' && $address === $this->normalizedValue($this->effectiveAddress($record)))
            ->take(20)
            ->map(fn (PemilihRecord $record) => $this->transformVoter($record))
            ->values();
        $byRumah = $records
            ->filter(fn (PemilihRecord $record) => $house !== ''
                && $house !== '-'
                && $house === $this->normalizedValue($record->no_rumah)
                && $locality !== ''
                && $locality === $this->normalizedValue($record->locality))
            ->take(20)
            ->map(fn (PemilihRecord $record) => $this->transformVoter($record))
            ->values();

        return response()->json([
            'by_address' => $byAddress,
            'by_rumah' => $byRumah,
        ]);
    }

    public function suggestCulaCodes(): JsonResponse
    {
        return response()->json(['codes' => CulaCodes::options()]);
    }

    public function senaraiPemilih(Request $request): Response
    {
        $user = $request->user();
        $filters = [
            'udm' => trim((string) $request->query('udm', '')),
            'locality' => trim((string) $request->query('locality', '')),
            'q' => trim((string) $request->query('q', '')),
        ];

        $query = $this->eligibleVoterQueryForUser($user);
        if ($filters['udm'] !== '') {
            $query->where('dm', $filters['udm']);
        }
        if ($filters['locality'] !== '') {
            $query->where('locality', $filters['locality']);
        }
        $this->applySearchFilter($query, $filters['q']);

        $voters = $query
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PemilihRecord $voter) => $this->transformVoter($voter));

        $udmQuery = $this->eligibleVoterQueryForUser($user)
            ->whereNotNull('dm')
            ->where('dm', '!=', '');
        $udms = $udmQuery->select('dm')->distinct()->orderBy('dm')->pluck('dm')->values()->all();

        $locQuery = $this->eligibleVoterQueryForUser($user)
            ->whereNotNull('locality')
            ->where('locality', '!=', '');
        if ($filters['udm'] !== '') {
            $locQuery->where('dm', $filters['udm']);
        }
        $localities = $locQuery->select('locality')->distinct()->orderBy('locality')->pluck('locality')->values()->all();

        $kads = KadTen::query()
            ->kadTenForUser($user)
            ->with('pemimpin')
            ->withCount('members')
            ->latest()
            ->get()
            ->map(fn (KadTen $kad) => [
                'id' => $kad->id,
                'name' => $kad->name,
                'pemimpin_name' => $kad->pemimpin?->name,
                'member_count' => $kad->members_count,
            ])
            ->values();

        return Inertia::render('KadTen/SenaraiPemilih', [
            'filters' => $filters,
            'voters' => $voters,
            'udms' => $udms,
            'localities' => $localities,
            'kads' => $kads,
            'can_manage' => $this->isManager($user),
        ]);
    }

    public function assignVoter(Request $request, KadTen $kadTen): JsonResponse
    {
        $this->ensureCanManage($request->user(), $kadTen);

        $validated = $request->validate([
            'pemilih_record_id' => ['required', 'integer', Rule::exists('pemilih_records', 'id')],
        ]);

        $voter = PemilihRecord::query()->findOrFail($validated['pemilih_record_id']);
        if ($voter->status !== 'aktif' || $voter->is_manual) {
            return response()->json(['message' => 'Pemilih tidak layak untuk Kad 10.'], 422);
        }
        if (! in_array($voter->cula_code, self::ALLOWED_CULA_CODES, true)) {
            return response()->json(['message' => 'Kod cula pemilih tidak dibenarkan.'], 422);
        }
        if (! $this->kadScopeMatchesVoter($kadTen, $voter)) {
            return response()->json(['message' => 'Pemilih bukan dalam skop Kad 10 ini.'], 422);
        }
        if ($voter->id === $kadTen->pemimpin_id) {
            return response()->json(['message' => 'Ketua tidak boleh menjadi ahli kad sendiri.'], 422);
        }
        if (KadTenMember::query()->where('pemilih_record_id', $voter->id)->exists()) {
            return response()->json(['message' => 'Pemilih sudah diagihkan ke kad lain.'], 422);
        }

        $created = DB::transaction(function () use ($request, $kadTen, $voter): int {
            PemilihRecord::query()
                ->whereKey($voter->id)
                ->lockForUpdate()
                ->first();

            if (KadTenMember::query()->where('pemilih_record_id', $voter->id)->exists()) {
                return 0;
            }

            $match = $this->matchDetails($kadTen->pemimpin, $voter);
            $now = now();

            return KadTenMember::query()->insertOrIgnore([
                'kad_ten_id' => $kadTen->id,
                'pemilih_record_id' => $voter->id,
                'cluster_type' => 'manual',
                'cluster_value' => null,
                'match_score' => $match['score'],
                'match_reason' => implode(', ', $match['reasons']),
                'created_by' => $request->user()->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        if ($created !== 1) {
            return response()->json(['message' => 'Pemilih baru sahaja diagihkan ke kad lain.'], 422);
        }

        return response()->json([
            'message' => 'Pemilih berjaya diagihkan ke '.($kadTen->name ?? 'Kad 10').'.',
        ]);
    }

    private function isManager(User $user): bool
    {
        $scope = $user->accessScope();

        return strtolower((string) $user->access_level) === 'udm'
            && $scope !== null
            && filled($scope['dm']);
    }

    private function ensureManager(User $user): void
    {
        abort_unless($this->isManager($user), 403, 'Hanya pengguna UDM boleh mengurus Kad 10.');
    }

    private function ensureCanManage(User $user, KadTen $kadTen): void
    {
        abort_unless($this->isManager($user) && $kadTen->isManageableBy($user), 403, 'Kad 10 ini bukan dalam skop UDM anda.');
    }

    private function managerMembership(User $user, int $membershipId): ?CommitteeMembership
    {
        if (! $this->isManager($user)) {
            return null;
        }

        $query = CommitteeMembership::query()
            ->with(['voter', 'position'])
            ->whereKey($membershipId)
            ->whereIn('level', ['udm', 'cawangan'])
            ->whereHas('voter', fn (Builder $builder) => $builder->where('status', 'aktif'));

        $this->applyManagerScopeToMembershipQuery($query, $user);

        $membership = $query->first();

        return $membership && $membership->voter && $this->scopeMatchesMembership($membership, $membership->voter)
            ? $membership
            : null;
    }

    private function applyManagerScopeToMembershipQuery(Builder $query, User $user): void
    {
        $scope = $user->accessScope();
        if ($scope === null || blank($scope['dm'])) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where(function (Builder $builder) use ($scope): void {
            $builder->where(function (Builder $subQuery) use ($scope): void {
                $subQuery->where('level', 'udm')
                    ->where('scope_key', $scope['dm']);
            })->orWhere(function (Builder $subQuery) use ($scope): void {
                $subQuery->where('level', 'cawangan')
                    ->where(function (Builder $scopeQuery) use ($scope): void {
                        $scopeQuery->where('parent_scope_name', $scope['dm'])
                            ->orWhere('scope_key', 'like', $scope['dm'].'|%');
                    });
            });
        });
    }

    private function hasMembersOutsideScope(KadTen $kadTen, CommitteeMembership $membership): bool
    {
        return $kadTen->members()
            ->with('voter')
            ->get()
            ->contains(fn (KadTenMember $member) => $member->voter
                && ! $this->scopeMatchesMembership($membership, $member->voter));
    }

    private function scopeMatchesMembership(CommitteeMembership $membership, PemilihRecord $voter): bool
    {
        if ($membership->level === 'udm') {
            return $voter->dm === $membership->scope_key;
        }

        if ($membership->level === 'cawangan') {
            [$dm, $locality] = array_pad(explode('|', (string) $membership->scope_key, 2), 2, null);

            return $voter->dm === $dm && $voter->locality === $locality;
        }

        return false;
    }

    private function eligibleVoterQueryForKad(KadTen $kadTen): Builder
    {
        $query = $this->eligibleVoterBaseQuery();
        $query->where('id', '!=', $kadTen->pemimpin_id)
            ->whereDoesntHave('kadTenMemberships');
        $this->applyKadScopeToVoterQuery($query, $kadTen);

        return $query;
    }

    private function eligibleVoterQueryForUser(User $user): Builder
    {
        $query = $this->eligibleVoterBaseQuery()->whereDoesntHave('kadTenMemberships');
        $user->applyScopeToPemilihQuery($query);

        return $query;
    }

    private function eligibleVoterBaseQuery(): Builder
    {
        return PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereIn('cula_code', self::ALLOWED_CULA_CODES);
    }

    private function applyKadScopeToVoterQuery(Builder $query, KadTen $kadTen): void
    {
        if ($kadTen->level === 'udm') {
            $query->where('dm', $kadTen->scope_key);

            return;
        }

        if ($kadTen->level === 'cawangan') {
            [$dm, $locality] = array_pad(explode('|', (string) $kadTen->scope_key, 2), 2, null);
            $query->where('dm', $dm)->where('locality', $locality);
        }
    }

    private function kadScopeMatchesVoter(KadTen $kadTen, PemilihRecord $voter): bool
    {
        if ($kadTen->level === 'udm') {
            return $voter->dm === $kadTen->scope_key;
        }

        if ($kadTen->level === 'cawangan') {
            [$dm, $locality] = array_pad(explode('|', (string) $kadTen->scope_key, 2), 2, null);

            return $voter->dm === $dm && $voter->locality === $locality;
        }

        return true;
    }

    private function applySearchFilter(Builder $query, string $search): void
    {
        if (mb_strlen($search) < 2) {
            return;
        }

        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($search)) ?: []));
        $query->where(function (Builder $subQuery) use ($keywords): void {
            foreach ($keywords as $keyword) {
                $like = '%'.$keyword.'%';
                $subQuery->where(function (Builder $q) use ($keyword, $like): void {
                    $q->whereRaw('LOWER(name) like ?', [$like])
                        ->orWhereRaw('LOWER(dm) like ?', [$like])
                        ->orWhereRaw('LOWER(locality) like ?', [$like])
                        ->orWhereRaw('LOWER(no_rumah) like ?', [$like])
                        ->orWhereRaw('LOWER(address) like ?', [$like])
                        ->orWhereRaw('LOWER(alamat_kp) like ?', [$like])
                        ->orWhereRaw('LOWER(alamat_kediaman) like ?', [$like]);
                    if (preg_match('/\d/', $keyword)) {
                        $digitLike = '%'.preg_replace('/\D+/', '', $keyword).'%';
                        $q->orWhere('no_kp', 'like', $digitLike)
                            ->orWhere('old_ic', 'like', $digitLike)
                            ->orWhere('phone_home', 'like', $digitLike)
                            ->orWhere('phone_mobile', 'like', $digitLike);
                    }
                });
            }
        });
    }

    private function rankVoters($records, ?PemilihRecord $leader, int $limit): array
    {
        return $records
            ->map(function (PemilihRecord $record) use ($leader): array {
                $match = $this->matchDetails($leader, $record);

                return $this->transformVoter($record, $match);
            })
            ->sort(function (array $left, array $right): int {
                $score = ($right['match_score'] ?? 0) <=> ($left['match_score'] ?? 0);
                if ($score !== 0) {
                    return $score;
                }

                return strnatcasecmp((string) ($left['name'] ?? ''), (string) ($right['name'] ?? ''));
            })
            ->take($limit)
            ->values()
            ->all();
    }

    private function matchDetails(?PemilihRecord $leader, PemilihRecord $voter): array
    {
        if (! $leader) {
            return [
                'score' => 0,
                'type' => 'manual',
                'reasons' => ['Padanan manual'],
            ];
        }

        $sameUdm = $this->normalizedValue($leader->dm) !== ''
            && $this->normalizedValue($leader->dm) === $this->normalizedValue($voter->dm);
        $sameLocality = $this->normalizedValue($leader->locality) !== ''
            && $this->normalizedValue($leader->locality) === $this->normalizedValue($voter->locality);
        $sameHouse = $this->normalizedValue($leader->no_rumah) !== ''
            && $this->normalizedValue($leader->no_rumah) !== '-'
            && $this->normalizedValue($leader->no_rumah) === $this->normalizedValue($voter->no_rumah);
        $sameAddress = $this->normalizedValue($this->effectiveAddress($leader)) !== ''
            && $this->normalizedValue($this->effectiveAddress($leader)) === $this->normalizedValue($this->effectiveAddress($voter));

        $reasons = [];
        if ($sameUdm) {
            $reasons[] = 'UDM sama';
        }
        if ($sameLocality) {
            $reasons[] = 'Lokaliti sama';
        }
        if ($sameHouse) {
            $reasons[] = 'No. rumah sama';
        }
        if ($sameAddress) {
            $reasons[] = 'Alamat sama';
        }

        $score = 0;
        $type = 'manual';
        if ($sameUdm) {
            $score = 10;
            $type = 'udm';
        }
        if ($sameLocality) {
            $score = 50;
            $type = 'localiti';
        }
        if ($sameHouse && $sameLocality) {
            $score = 80;
            $type = 'no_rumah';
        } elseif ($sameHouse) {
            $score = 60;
            $type = 'no_rumah';
        }
        if ($sameAddress && $sameLocality) {
            $score = 90;
            $type = 'alamat';
        } elseif ($sameAddress) {
            $score = 70;
            $type = 'alamat';
        }
        if ($sameAddress && $sameHouse && $sameLocality) {
            $score = 100;
            $type = 'alamat';
        }

        if ($reasons === []) {
            $reasons[] = 'Padanan manual';
        }

        return [
            'score' => $score,
            'type' => $type,
            'reasons' => $reasons,
        ];
    }

    private function clusterValue(string $type, PemilihRecord $voter): ?string
    {
        $value = match ($type) {
            'alamat' => $this->effectiveAddress($voter),
            'no_rumah' => trim(implode(' / ', array_filter([$voter->no_rumah, $voter->locality]))),
            'localiti' => $voter->locality,
            'udm' => $voter->dm,
            default => null,
        };

        return filled($value) ? mb_substr((string) $value, 0, 255) : null;
    }

    private function effectiveAddress(PemilihRecord $voter): string
    {
        foreach ([$voter->alamat_kediaman, $voter->address, $voter->alamat_kp] as $address) {
            if (filled($address) && trim((string) $address) !== '-') {
                return trim((string) $address);
            }
        }

        return '';
    }

    private function normalizedValue(?string $value): string
    {
        $value = mb_strtolower(trim((string) $value));

        return preg_replace('/[^\pL\pN]+/u', '', $value) ?? '';
    }

    private function transformVoter(PemilihRecord $record, ?array $match = null): array
    {
        return [
            'id' => $record->id,
            'name' => $record->name,
            'no_kp' => $record->no_kp,
            'old_ic' => $record->old_ic,
            'dm' => $record->dm,
            'locality' => $record->locality,
            'no_rumah' => $record->no_rumah,
            'address' => $record->address,
            'alamat_kp' => $record->alamat_kp,
            'alamat_kediaman' => $record->alamat_kediaman,
            'cula_code' => $record->cula_code,
            'cula_display_label' => $record->cula_display_label,
            'phone_mobile' => $record->phone_mobile,
            'phone_home' => $record->phone_home,
            'avatar_url' => $record->avatarUrl(),
            'match_score' => $match['score'] ?? null,
            'match_type' => $match['type'] ?? null,
            'match_reason' => $match ? implode(', ', $match['reasons']) : null,
        ];
    }

    private function resolveScope(string $level, string $scopeKey, PemilihRecord $voter): array
    {
        return match ($level) {
            'udm' => [$scopeKey, null],
            'cawangan' => $this->resolveCawanganScope($scopeKey, $voter),
            default => ['JPRD', null],
        };
    }

    private function resolveCawanganScope(string $scopeKey, PemilihRecord $voter): array
    {
        $parts = explode('|', $scopeKey, 2);
        $parent = $parts[0] ?? $voter->dm ?? '';
        $scopeName = $parts[1] ?? $voter->locality ?? '';

        return [$scopeName, $parent !== '' ? $parent : null];
    }
}
