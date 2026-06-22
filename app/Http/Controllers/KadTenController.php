<?php

namespace App\Http\Controllers;

use App\Models\CommitteeMembership;
use App\Models\KadTen;
use App\Models\KadTenMember;
use App\Models\PemilihRecord;
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

    public function index(Request $request): Response
    {
        $user = $request->user();

        $kads = KadTen::query()
            ->with(['pemimpin', 'members.voter', 'creator'])
            ->kadTenForUser($user)
            ->latest()
            ->get()
            ->map(fn (KadTen $kad) => [
                'id' => $kad->id,
                'name' => $kad->name,
                'pemimpin' => $kad->pemimpin ? [
                    'id' => $kad->pemimpin->id,
                    'name' => $kad->pemimpin->name,
                    'no_kp' => $kad->pemimpin->no_kp,
                    'old_ic' => $kad->pemimpin->old_ic,
                    'dm' => $kad->pemimpin->dm,
                    'locality' => $kad->pemimpin->locality,
                    'avatar_url' => $kad->pemimpin->avatarUrl(),
                    'phone_mobile' => $kad->pemimpin->phone_mobile,
                ] : null,
                'level' => $kad->level,
                'scope_key' => $kad->scope_key,
                'scope_name' => $kad->scope_name,
                'parent_scope_name' => $kad->parent_scope_name,
                'notes' => $kad->notes,
                'creator_name' => $kad->creator?->name,
                'members' => $kad->members->map(fn (KadTenMember $m) => [
                    'id' => $m->id,
                    'pemilih_record_id' => $m->pemilih_record_id,
                    'cluster_type' => $m->cluster_type,
                    'cluster_value' => $m->cluster_value,
                    'voter' => $m->voter ? [
                        'id' => $m->voter->id,
                        'name' => $m->voter->name,
                        'no_kp' => $m->voter->no_kp,
                        'old_ic' => $m->voter->old_ic,
                        'dm' => $m->voter->dm,
                        'locality' => $m->voter->locality,
                        'no_rumah' => $m->voter->no_rumah,
                        'address' => $m->voter->address,
                        'phone_mobile' => $m->voter->phone_mobile,
                        'phone_home' => $m->voter->phone_home,
                        'cula_code' => $m->voter->cula_code,
                        'cula_display_label' => $m->voter->cula_display_label,
                        'avatar_url' => $m->voter->avatarUrl(),
                    ] : null,
                ])->values(),
                'member_count' => $kad->members->count(),
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
            'scopes' => [
                'jprd' => [
                    ['key' => 'jprd', 'name' => 'JPRD', 'parent_scope_name' => null],
                ],
                'udm' => $udmQuery
                    ->select('dm')
                    ->distinct()
                    ->orderBy('dm')
                    ->get()
                    ->map(fn (PemilihRecord $r) => [
                        'key' => $r->dm,
                        'name' => $r->dm,
                        'parent_scope_name' => null,
                    ])
                    ->values(),
                'cawangan' => $cawanganQuery
                    ->select('dm', 'locality')
                    ->distinct()
                    ->orderBy('dm')
                    ->orderBy('locality')
                    ->get()
                    ->map(fn (PemilihRecord $r) => [
                        'key' => $r->dm.'|'.$r->locality,
                        'name' => $r->locality,
                        'parent_scope_name' => $r->dm,
                    ])
                    ->values(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'pemimpin_id' => ['required', 'integer', Rule::exists('pemilih_records', 'id')],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $voter = PemilihRecord::query()->findOrFail($validated['pemimpin_id']);

        if ($voter->status !== 'aktif') {
            return back()->withErrors(['pemimpin_id' => 'Hanya pemilih aktif boleh dilantik sebagai ketua.']);
        }

        $membership = CommitteeMembership::query()
            ->where('pemilih_record_id', $voter->id)
            ->first();

        if (! $membership) {
            return back()->withErrors(['pemimpin_id' => 'Pemilih ini bukan ahli jawatankuasa. Sila lantik sebagai AJK dahulu.']);
        }

        [$scopeName, $parentScopeName] = $this->resolveScope($membership->level, $membership->scope_key, $voter);

        KadTen::query()->create([
            'name' => $validated['name'] ?? null,
            'pemimpin_id' => $voter->id,
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
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'pemimpin_id' => ['required', 'integer', Rule::exists('pemilih_records', 'id')],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $voter = PemilihRecord::query()->findOrFail($validated['pemimpin_id']);

        if ($voter->status !== 'aktif') {
            return back()->withErrors(['pemimpin_id' => 'Hanya pemilih aktif boleh dilantik sebagai ketua.']);
        }

        $membership = CommitteeMembership::query()
            ->where('pemilih_record_id', $voter->id)
            ->first();

        if (! $membership) {
            return back()->withErrors(['pemimpin_id' => 'Pemilih ini bukan ahli jawatankuasa.']);
        }

        [$scopeName, $parentScopeName] = $this->resolveScope($membership->level, $membership->scope_key, $voter);

        $kadTen->update([
            'name' => $validated['name'] ?? $kadTen->name,
            'pemimpin_id' => $voter->id,
            'level' => $membership->level,
            'scope_key' => $membership->scope_key,
            'scope_name' => $scopeName,
            'parent_scope_name' => $parentScopeName,
            'notes' => $validated['notes'] ?? $kadTen->notes,
        ]);

        return redirect()
            ->route('kad-ten.index')
            ->with('success', 'Kad 10 berjaya dikemaskini.');
    }

    public function destroy(KadTen $kadTen): RedirectResponse
    {
        $kadTen->delete();

        return redirect()
            ->route('kad-ten.index')
            ->with('success', 'Kad 10 berjaya dipadam.');
    }

    public function storeMember(Request $request, KadTen $kadTen): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'pemilih_record_ids' => ['required', 'array'],
            'pemilih_record_ids.*' => ['required', 'integer', Rule::exists('pemilih_records', 'id')],
            'cluster_type' => ['nullable', Rule::in(['alamat', 'no_rumah', 'manual'])],
            'cluster_value' => ['nullable', 'string', 'max:500'],
        ]);

        $voters = PemilihRecord::query()
            ->whereIn('id', $validated['pemilih_record_ids'])
            ->where('status', 'aktif')
            ->where(function (Builder $q) {
                $q->whereIn('cula_code', self::ALLOWED_CULA_CODES)
                  ->orWhereNull('cula_code')
                  ->orWhere('cula_code', '')
                  ->orWhere('cula_code', '?')
                  ->orWhere('cula_code', 'TIADA');
            })
            ->get()
            ->keyBy('id');

        $inserted = 0;
        $skipped = [];

        foreach ($validated['pemilih_record_ids'] as $id) {
            if (! isset($voters[$id])) {
                continue;
            }

            $exists = KadTenMember::query()
                ->where('kad_ten_id', $kadTen->id)
                ->where('pemilih_record_id', $id)
                ->exists();

            if ($exists) {
                $skipped[] = $voters[$id]->name;
                continue;
            }

            KadTenMember::query()->create([
                'kad_ten_id' => $kadTen->id,
                'pemilih_record_id' => $id,
                'cluster_type' => $validated['cluster_type'] ?? null,
                'cluster_value' => $validated['cluster_value'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $inserted++;
        }

        $message = $inserted > 0 ? "$inserted ahli berjaya ditambah." : 'Tiada ahli baru ditambah.';
        if ($skipped !== []) {
            $message .= ' (' . count($skipped) . ' sudah wujud: ' . implode(', ', array_slice($skipped, 0, 3)) . ')';
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

    public function destroyMember(KadTen $kadTen, KadTenMember $member): RedirectResponse|JsonResponse
    {
        $member->delete();

        if (request()->expectsJson()) {
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

        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($query)) ?: []));

        $builder = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->where(function (Builder $q) {
                $q->whereIn('cula_code', self::ALLOWED_CULA_CODES)
                  ->orWhereNull('cula_code')
                  ->orWhere('cula_code', '')
                  ->orWhere('cula_code', '?')
                  ->orWhere('cula_code', 'TIADA');
            });

        $request->user()->applyScopeToPemilihQuery($builder);

        $builder->where(function (Builder $subQuery) use ($keywords) {
            foreach ($keywords as $keyword) {
                $like = '%'.$keyword.'%';
                $subQuery->where(function (Builder $q) use ($keyword, $like) {
                    $q->whereRaw('LOWER(name) like ?', [$like])
                      ->orWhereRaw('LOWER(dm) like ?', [$like])
                      ->orWhereRaw('LOWER(locality) like ?', [$like]);

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

        $scope = $request->user()->accessScope();
        if ($scope !== null && filled($scope['dm'])) {
            $dm = $scope['dm'];
            if (filled($scope['locality'])) {
                $builder->orderByRaw("CASE WHEN dm = ? AND locality = ? THEN 0 ELSE 1 END", [$dm, $scope['locality']]);
            } else {
                $builder->orderByRaw("CASE WHEN dm = ? THEN 0 ELSE 1 END", [$dm]);
            }
        }

        $suggestions = $builder
            ->limit(8)
            ->get()
            ->map(fn (PemilihRecord $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'no_kp' => $r->no_kp,
                'old_ic' => $r->old_ic,
                'dm' => $r->dm,
                'locality' => $r->locality,
                'no_rumah' => $r->no_rumah,
                'address' => $r->address,
                'cula_code' => $r->cula_code,
                'cula_display_label' => $r->cula_display_label,
                'phone_mobile' => $r->phone_mobile,
            ])
            ->values();

        return response()->json(['suggestions' => $suggestions]);
    }

    public function suggestPemimpin(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        $level = $request->query('level');

        $membershipsQuery = CommitteeMembership::query()
            ->with(['voter', 'position'])
            ->whereHas('voter', fn (Builder $q) => $q->where('status', 'aktif'));

        if ($level && in_array($level, ['jprd', 'udm', 'cawangan'])) {
            $membershipsQuery->where('level', $level);
        }

        $user = $request->user();
        $scope = $user->accessScope();

        if ($scope !== null) {
            if (filled($scope['dm']) && filled($scope['locality'])) {
                $membershipsQuery->where(function ($q) use ($scope) {
                    $q->where('level', 'jprd')
                      ->orWhere(function ($sq) use ($scope) {
                          $sq->where('level', 'cawangan')
                             ->where('scope_key', $scope['dm'].'|'.$scope['locality']);
                      });
                });
            } elseif (filled($scope['dm'])) {
                $membershipsQuery->where(function ($q) use ($scope) {
                    $q->where('level', 'jprd')
                      ->orWhere(function ($sq) use ($scope) {
                          $sq->where('level', 'udm')
                             ->where('scope_key', $scope['dm']);
                      })
                      ->orWhere(function ($sq) use ($scope) {
                          $sq->where('level', 'cawangan')
                             ->where('parent_scope_name', $scope['dm']);
                      });
                });
            }
        }

        if (mb_strlen($query) >= 2) {
            $like = '%'.$query.'%';
            $membershipsQuery->whereHas('voter', function (Builder $q) use ($like, $query) {
                $q->where(function (Builder $sq) use ($like, $query) {
                    $sq->whereRaw('LOWER(name) like ?', [$like])
                      ->orWhere('no_kp', 'like', $like)
                      ->orWhere('old_ic', 'like', $like);
                });
            });
        }

        $results = $membershipsQuery
            ->limit(10)
            ->get()
            ->map(fn (CommitteeMembership $m) => [
                'id' => $m->voter?->id,
                'name' => $m->voter?->name,
                'no_kp' => $m->voter?->no_kp,
                'old_ic' => $m->voter?->old_ic,
                'dm' => $m->voter?->dm,
                'locality' => $m->voter?->locality,
                'position_name' => $m->position?->name,
                'level' => $m->level,
                'scope_name' => $m->scope_name,
                'avatar_url' => $m->voter?->avatarUrl(),
                'phone_mobile' => $m->voter?->phone_mobile,
            ])
            ->values();

        return response()->json(['suggestions' => $results]);
    }

    public function clustersFor(PemilihRecord $pemilihRecord): JsonResponse
    {
        $user = request()->user();

        $byAddress = [];
        $address = $pemilihRecord->address;
        if (filled($address)) {
            $byAddress = PemilihRecord::query()
                ->where('status', 'aktif')
                ->where('is_manual', false)
                ->where('address', $address)
                ->where('id', '!=', $pemilihRecord->id)
                ->tap(fn (Builder $b) => $user->applyScopeToPemilihQuery($b))
                ->where(function (Builder $q) {
                    $q->whereIn('cula_code', self::ALLOWED_CULA_CODES)
                      ->orWhereNull('cula_code')
                      ->orWhere('cula_code', '')
                      ->orWhere('cula_code', '?')
                      ->orWhere('cula_code', 'TIADA');
                })
                ->limit(20)
                ->get()
                ->map(fn (PemilihRecord $r) => $this->transformVoter($r))
                ->values();
        }

        $byRumah = [];
        $noRumah = $pemilihRecord->no_rumah;
        $locality = $pemilihRecord->locality;
        if (filled($noRumah) && filled($locality) && $noRumah !== '-') {
            $byRumah = PemilihRecord::query()
                ->where('status', 'aktif')
                ->where('is_manual', false)
                ->where('no_rumah', $noRumah)
                ->where('locality', $locality)
                ->where('id', '!=', $pemilihRecord->id)
                ->tap(fn (Builder $b) => $user->applyScopeToPemilihQuery($b))
                ->where(function (Builder $q) {
                    $q->whereIn('cula_code', self::ALLOWED_CULA_CODES)
                      ->orWhereNull('cula_code')
                      ->orWhere('cula_code', '')
                      ->orWhere('cula_code', '?')
                      ->orWhere('cula_code', 'TIADA');
                })
                ->limit(20)
                ->get()
                ->map(fn (PemilihRecord $r) => $this->transformVoter($r))
                ->values();
        }

        return response()->json([
            'by_address' => $byAddress,
            'by_rumah' => $byRumah,
        ]);
    }

    public function suggestCulaCodes(): JsonResponse
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->where('cula_code', '!=', 'TIADA');

        request()->user()->applyScopeToPemilihQuery($query);

        $codes = $query
            ->select('cula_code', DB::raw('MAX(cula_display_label) as display_label'))
            ->groupBy('cula_code')
            ->orderBy('cula_code')
            ->get()
            ->map(fn ($r) => ['code' => $r->cula_code, 'label' => $r->display_label])
            ->values()
            ->all();

        return response()->json(['codes' => $codes]);
    }

    private function resolveScope(string $level, string $scopeKey, PemilihRecord $voter): array
    {
        return match ($level) {
            'jprd' => ['JPRD', null],
            'udm' => [$scopeKey, null],
            'cawangan' => $this->resolveCawanganScope($scopeKey, $voter),
        };
    }

    private function resolveCawanganScope(string $scopeKey, PemilihRecord $voter): array
    {
        $parts = explode('|', $scopeKey, 2);
        $parent = $parts[0] ?? $voter->dm ?? '';
        $scopeName = $parts[1] ?? $voter->locality ?? '';

        return [$scopeName, $parent !== '' ? $parent : null];
    }

    private function transformVoter(PemilihRecord $r): array
    {
        return [
            'id' => $r->id,
            'name' => $r->name,
            'no_kp' => $r->no_kp,
            'old_ic' => $r->old_ic,
            'dm' => $r->dm,
            'locality' => $r->locality,
            'no_rumah' => $r->no_rumah,
            'address' => $r->address,
            'cula_code' => $r->cula_code,
            'cula_display_label' => $r->cula_display_label,
            'phone_mobile' => $r->phone_mobile,
            'phone_home' => $r->phone_home,
            'avatar_url' => $r->avatarUrl(),
        ];
    }
}
