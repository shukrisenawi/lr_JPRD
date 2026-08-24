<?php

namespace App\Http\Controllers;

use App\Models\CommitteeGroup;
use App\Models\CommitteeMembership;
use App\Models\CommitteePosition;
use App\Models\PemilihRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CommitteeController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $scope = $user->accessScope();

        $membershipsQuery = CommitteeMembership::query()
            ->with(['position', 'voter', 'creator'])
            ->orderBy('level')
            ->orderBy('scope_name')
            ->latest('id');

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

        $udmQuery = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereNotNull('dm')
            ->where('dm', '!=', '');
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

        $udmScopes = (clone $udmQuery)
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->get();

        $udmMemberCounts = CommitteeMembership::query()
            ->where('level', 'udm')
            ->whereNotNull('committee_group_id')
            ->whereIn('scope_key', $udmScopes->pluck('dm'))
            ->select('scope_key')
            ->selectRaw('COUNT(*) as members_count')
            ->groupBy('scope_key')
            ->pluck('members_count', 'scope_key');

        $udmStatuses = $udmScopes
            ->map(fn (PemilihRecord $record) => [
                'key' => $record->dm,
                'name' => $record->dm,
                'members_count' => (int) ($udmMemberCounts[$record->dm] ?? 0),
                'has_members' => (int) ($udmMemberCounts[$record->dm] ?? 0) > 0,
            ])
            ->values();

        return Inertia::render('Committee/Index', [
            'groups' => CommitteeGroup::query()
                ->with(['positions' => function ($q) {
                    $q->orderBy('committee_group_position.sort_order');
                }])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (CommitteeGroup $group) => [
                    'id' => $group->id,
                    'name' => $group->name,
                    'levels' => $group->levels,
                    'sort_order' => $group->sort_order,
                    'description' => $group->description,
                    'positions' => $group->positions
                        ->map(fn (CommitteePosition $position) => [
                            'id' => $position->id,
                            'name' => $position->name,
                            'slug' => $position->slug,
                            'sort_order' => $position->sort_order,
                            'pivot_level' => $position->pivot->level,
                            'pivot_sort_order' => $position->pivot->sort_order,
                        ])
                        ->values(),
                ])
                ->values(),
            'positions' => CommitteePosition::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (CommitteePosition $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'sort_order' => $p->sort_order,
                    'level' => $p->level,
                ])
                ->values(),
            'memberships' => $membershipsQuery
                ->get()
                ->map(fn (CommitteeMembership $membership) => [
                    'id' => $membership->id,
                    'pemilih_record_id' => $membership->pemilih_record_id,
                    'committee_group_id' => $membership->committee_group_id,
                    'updated_at' => $membership->updated_at,
                    'level' => $membership->level,
                    'scope_key' => $membership->scope_key,
                    'scope_name' => $membership->scope_name,
                    'parent_scope_name' => $membership->parent_scope_name,
                    'notes' => $membership->notes,
                    'created_by' => $membership->created_by,
                    'creator_name' => $membership->creator?->name,
                    'position' => [
                        'id' => $membership->position?->id,
                        'name' => $membership->position?->name,
                        'sort_order' => $membership->position?->sort_order,
                    ],
                    'voter' => [
                        'id' => $membership->voter?->id,
                        'name' => $membership->voter?->name,
                        'no_kp' => $membership->voter?->no_kp,
                        'old_ic' => $membership->voter?->old_ic,
                        'phone_mobile' => $membership->voter?->phone_mobile,
                        'phone_home' => $membership->voter?->phone_home,
                        'dm' => $membership->voter?->dm,
                        'locality' => $membership->voter?->locality,
                        'status' => $membership->voter?->status,
                        'avatar' => $membership->voter?->avatar,
                        'updated_at' => $membership->voter?->updated_at,
                        'avatar_url' => $membership->voter?->avatarUrl(),
                    ],
                ])
                ->values(),
            'scopes' => [
                'jprd' => [
                    [
                        'key' => 'jprd',
                        'name' => 'JPRD',
                        'parent_scope_name' => null,
                    ],
                ],
                'udm' => $udmStatuses
                    ->map(fn (array $status) => [
                        'key' => $status['key'],
                        'name' => $status['name'],
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
            'udm_statuses' => $udmStatuses,
        ]);
    }

    public function laporan(Request $request): Response
    {
        $user = $request->user();
        $scope = $user->accessScope();

        $membershipsQuery = CommitteeMembership::query()
            ->with(['position', 'voter', 'creator'])
            ->orderBy('level')
            ->orderBy('scope_name')
            ->latest('id');

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

        $udmQuery = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereNotNull('dm')
            ->where('dm', '!=', '');
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

        return Inertia::render('Committee/Laporan', [
            'groups' => CommitteeGroup::query()
                ->with(['positions' => function ($q) {
                    $q->orderBy('committee_group_position.sort_order');
                }])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (CommitteeGroup $group) => [
                    'id' => $group->id,
                    'name' => $group->name,
                    'levels' => $group->levels,
                    'sort_order' => $group->sort_order,
                    'description' => $group->description,
                    'positions' => $group->positions
                        ->map(fn (CommitteePosition $position) => [
                            'id' => $position->id,
                            'name' => $position->name,
                            'slug' => $position->slug,
                            'sort_order' => $position->sort_order,
                            'pivot_level' => $position->pivot->level,
                            'pivot_sort_order' => $position->pivot->sort_order,
                        ])
                        ->values(),
                ])
                ->values(),
            'memberships' => $membershipsQuery
                ->get()
                ->map(fn (CommitteeMembership $membership) => [
                    'id' => $membership->id,
                    'pemilih_record_id' => $membership->pemilih_record_id,
                    'committee_group_id' => $membership->committee_group_id,
                    'updated_at' => $membership->updated_at,
                    'level' => $membership->level,
                    'scope_key' => $membership->scope_key,
                    'scope_name' => $membership->scope_name,
                    'parent_scope_name' => $membership->parent_scope_name,
                    'notes' => $membership->notes,
                    'created_by' => $membership->created_by,
                    'creator_name' => $membership->creator?->name,
                    'position' => [
                        'id' => $membership->position?->id,
                        'name' => $membership->position?->name,
                        'sort_order' => $membership->position?->sort_order,
                    ],
                    'voter' => [
                        'id' => $membership->voter?->id,
                        'name' => $membership->voter?->name,
                        'no_kp' => $membership->voter?->no_kp,
                        'old_ic' => $membership->voter?->old_ic,
                        'phone_mobile' => $membership->voter?->phone_mobile,
                        'phone_home' => $membership->voter?->phone_home,
                        'dm' => $membership->voter?->dm,
                        'locality' => $membership->voter?->locality,
                        'status' => $membership->voter?->status,
                        'avatar' => $membership->voter?->avatar,
                        'updated_at' => $membership->voter?->updated_at,
                        'avatar_url' => $membership->voter?->avatarUrl(),
                    ],
                ])
                ->values(),
            'scopes' => [
                'jprd' => [
                    [
                        'key' => 'jprd',
                        'name' => 'JPRD',
                        'parent_scope_name' => null,
                    ],
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
        ]);
    }

    public function senaraiAjkUdm(Request $request): Response
    {
        $user = $request->user();
        $scope = $user->accessScope();

        if ($scope === null || ! filled($scope['dm'])) {
            abort(403, 'Akses hanya untuk pengguna UDM.');
        }

        $dm = $scope['dm'];

        $memberships = CommitteeMembership::query()
            ->with(['position', 'voter', 'creator'])
            ->where('level', 'udm')
            ->where('scope_key', $dm)
            ->orderBy('scope_name')
            ->latest('id')
            ->get()
            ->map(fn (CommitteeMembership $membership) => [
                'id' => $membership->id,
                'pemilih_record_id' => $membership->pemilih_record_id,
                'committee_group_id' => $membership->committee_group_id,
                'updated_at' => $membership->updated_at,
                'level' => $membership->level,
                'scope_key' => $membership->scope_key,
                'scope_name' => $membership->scope_name,
                'parent_scope_name' => $membership->parent_scope_name,
                'notes' => $membership->notes,
                'created_by' => $membership->created_by,
                'creator_name' => $membership->creator?->name,
                'position' => [
                    'id' => $membership->position?->id,
                    'name' => $membership->position?->name,
                    'sort_order' => $membership->position?->sort_order,
                ],
                'voter' => [
                    'id' => $membership->voter?->id,
                    'name' => $membership->voter?->name,
                    'no_kp' => $membership->voter?->no_kp,
                    'old_ic' => $membership->voter?->old_ic,
                    'phone_mobile' => $membership->voter?->phone_mobile,
                    'phone_home' => $membership->voter?->phone_home,
                    'dm' => $membership->voter?->dm,
                    'locality' => $membership->voter?->locality,
                    'status' => $membership->voter?->status,
                    'avatar' => $membership->voter?->avatar,
                    'updated_at' => $membership->voter?->updated_at,
                    'avatar_url' => $membership->voter?->avatarUrl(),
                ],
            ])
            ->values();

        return Inertia::render('Committee/SenaraiAjkUdm', [
            'dm' => $dm,
            'memberships' => $memberships,
            'groups' => CommitteeGroup::query()
                ->with(['positions' => function ($q) {
                    $q->orderBy('committee_group_position.sort_order');
                }])
                ->where(function ($q) {
                    $q->whereJsonContains('levels', 'udm');
                })
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (CommitteeGroup $group) => [
                    'id' => $group->id,
                    'name' => $group->name,
                    'levels' => $group->levels,
                    'sort_order' => $group->sort_order,
                    'description' => $group->description,
                    'positions' => $group->positions
                        ->where('pivot.level', 'udm')
                        ->map(fn (CommitteePosition $position) => [
                            'id' => $position->id,
                            'name' => $position->name,
                            'slug' => $position->slug,
                            'sort_order' => $position->sort_order,
                            'pivot_level' => $position->pivot->level,
                            'pivot_sort_order' => $position->pivot->sort_order,
                        ])
                        ->values(),
                ])
                ->values(),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([
                'suggestions' => [],
            ]);
        }

        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($query)) ?: []));

        $builder = PemilihRecord::query()
            ->where(function ($q) {
                $q->where('status', 'aktif')
                    ->orWhere('is_manual', true);
            })
            ->where(function ($builder) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $like = '%'.$keyword.'%';

                    $builder->where(function ($subQuery) use ($keyword, $like) {
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
            });

        $selectedScopeKey = $request->query('scope_key');
        $selectedLevel = $request->query('level');

        if ($selectedLevel === 'udm' && filled($selectedScopeKey)) {
            $builder->orderByRaw('CASE WHEN dm = ? THEN 0 ELSE 1 END', [$selectedScopeKey]);
        } elseif ($selectedLevel === 'cawangan' && filled($selectedScopeKey)) {
            $parts = explode('|', $selectedScopeKey);
            $dm = $parts[0] ?? '';
            $locality = $parts[1] ?? '';
            $builder->orderByRaw('CASE WHEN dm = ? AND locality = ? THEN 0 ELSE 1 END', [$dm, $locality]);
        } else {
            $user = $request->user();
            $scope = $user?->accessScope();

            if ($scope !== null && filled($scope['dm'])) {
                $dm = $scope['dm'];
                if (filled($scope['locality'])) {
                    $builder->orderByRaw('CASE WHEN dm = ? AND locality = ? THEN 0 ELSE 1 END', [$dm, $scope['locality']]);
                } else {
                    $builder->orderByRaw('CASE WHEN dm = ? THEN 0 ELSE 1 END', [$dm]);
                }
            }
        }

        $suggestions = $builder
            ->limit(8)
            ->get()
            ->map(fn (PemilihRecord $record) => [
                'id' => $record->id,
                'name' => $record->name,
                'dm' => $record->dm,
                'locality' => $record->locality,
            ])
            ->values();

        return response()->json([
            'suggestions' => $suggestions,
        ]);
    }

    // ─── Groups ───────────────────────────────────────────────────

    public function storeGroup(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('committee_groups', 'name')],
            'levels' => ['required', 'array'],
            'levels.*' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        CommitteeGroup::query()->create([
            'name' => $validated['name'],
            'levels' => $validated['levels'],
            'sort_order' => CommitteeGroup::query()->max('sort_order') + 1,
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Kumpulan berjaya ditambah.');
    }

    public function updateGroup(Request $request, CommitteeGroup $group): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('committee_groups', 'name')->ignore($group->id)],
            'levels' => ['required', 'array'],
            'levels.*' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $group->update([
            'name' => $validated['name'],
            'levels' => $validated['levels'],
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Kumpulan berjaya dikemaskini.');
    }

    public function destroyGroup(CommitteeGroup $group): RedirectResponse
    {
        if ($group->positions()->exists()) {
            return redirect()
                ->route('jawatankuasa.index')
                ->with('error', 'Kumpulan yang mempunyai jawatan tidak boleh dipadam.');
        }

        $group->delete();

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Kumpulan berjaya dipadam.');
    }

    // ─── Positions (Global Master List) ────────────────────────────

    public function storePosition(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:1000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'level' => ['nullable', Rule::in(['jprd', 'udm', 'cawangan'])],
        ]);

        $names = array_values(array_filter(array_map(
            fn (string $n) => trim($n),
            explode(',', $validated['name'])
        )));

        if ($names === []) {
            return back()->withErrors(['name' => 'Sila masukkan sekurang-kurangnya satu nama jawatan.']);
        }

        $existing = CommitteePosition::query()->whereIn('name', $names)->pluck('name')->all();

        $existingLower = array_map('strtolower', $existing);

        $baseSortOrder = $validated['sort_order'] ?? CommitteePosition::query()->max('sort_order') + 1;

        $inserted = 0;

        foreach ($names as $index => $name) {
            if (in_array(strtolower($name), $existingLower)) {
                continue;
            }
            CommitteePosition::query()->create([
                'name' => $name,
                'slug' => Str::slug($name),
                'sort_order' => $baseSortOrder + $index,
                'level' => $validated['level'] ?? null,
            ]);
            $inserted++;
        }

        if ($existing !== []) {
            return redirect()
                ->route('jawatankuasa.index')
                ->with('warning', 'Jawatan sudah wujud: '.implode(', ', $existing).'.');
        }

        if ($inserted > 0) {
            return redirect()
                ->route('jawatankuasa.index')
                ->with('success', $inserted.' jawatan berjaya ditambah.');
        }

        return redirect()
            ->route('jawatankuasa.index')
            ->with('warning', 'Tiada jawatan baru ditambah. Semua nama jawatan sudah wujud.');
    }

    public function updatePosition(Request $request, CommitteePosition $position): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('committee_positions', 'name')->ignore($position->id)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'level' => ['nullable', Rule::in(['jprd', 'udm', 'cawangan'])],
        ]);

        $position->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'sort_order' => $validated['sort_order'] ?? 0,
            'level' => $validated['level'] ?? null,
        ]);

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Jawatan berjaya dikemaskini.');
    }

    public function destroyPosition(CommitteePosition $position): RedirectResponse
    {
        if ($position->memberships()->exists()) {
            return redirect()
                ->route('jawatankuasa.index')
                ->with('error', 'Jawatan yang sedang digunakan tidak boleh dipadam.');
        }

        $position->groups()->detach();
        $position->delete();

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Jawatan berjaya dipadam.');
    }

    public function reorderPositions(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'positions' => ['required', 'array'],
            'positions.*.id' => ['required', 'exists:committee_positions,id'],
            'positions.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['positions'] as $item) {
                CommitteePosition::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
            }
        });

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Susunan jawatan berjaya dikemas kini.');
    }

    // ─── Group-Position Assignments (Pivot) ────────────────────────

    public function storeGroupPosition(Request $request, CommitteeGroup $group): RedirectResponse
    {
        $validated = $request->validate([
            'committee_position_id' => ['required', 'exists:committee_positions,id'],
            'level' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
        ]);

        if (! in_array($validated['level'], $group->levels)) {
            return back()->withErrors(['level' => 'Peringkat tidak sah untuk kumpulan ini.']);
        }

        $maxSortOrder = DB::table('committee_group_position')
            ->where('committee_group_id', $group->id)
            ->where('level', $validated['level'])
            ->max('sort_order') ?? -1;

        $group->positions()->attach($validated['committee_position_id'], [
            'level' => $validated['level'],
            'sort_order' => $maxSortOrder + 1,
        ]);

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Jawatan berjaya dikaitkan.');
    }

    public function storeGroupPositions(Request $request, CommitteeGroup $group): RedirectResponse
    {
        $validated = $request->validate([
            'committee_position_ids' => ['required', 'array'],
            'committee_position_ids.*' => ['required', 'exists:committee_positions,id'],
            'level' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
        ]);

        if (! in_array($validated['level'], $group->levels)) {
            return back()->withErrors(['level' => 'Peringkat tidak sah untuk kumpulan ini.']);
        }

        $existing = DB::table('committee_group_position')
            ->where('committee_group_id', $group->id)
            ->where('level', $validated['level'])
            ->whereIn('committee_position_id', $validated['committee_position_ids'])
            ->pluck('committee_position_id')
            ->all();

        $maxSortOrder = DB::table('committee_group_position')
            ->where('committee_group_id', $group->id)
            ->where('level', $validated['level'])
            ->max('sort_order') ?? -1;

        $insert = [];
        foreach ($validated['committee_position_ids'] as $i => $positionId) {
            if (in_array($positionId, $existing)) {
                continue;
            }
            $insert[] = [
                'committee_group_id' => $group->id,
                'committee_position_id' => $positionId,
                'level' => $validated['level'],
                'sort_order' => $maxSortOrder + 1 + $i,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if ($insert !== []) {
            DB::table('committee_group_position')->insert($insert);
        }

        $count = count($insert);
        $skipped = count($validated['committee_position_ids']) - $count;

        $message = $count > 0
            ? "$count jawatan berjaya ditambah."
            : 'Tiada jawatan baru ditambah.';

        if ($skipped > 0) {
            $message .= " ($skipped sudah wujud).";
        }

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', $message);
    }

    public function destroyGroupPosition(Request $request, CommitteeGroup $group, CommitteePosition $position): RedirectResponse
    {
        $validated = $request->validate([
            'level' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
        ]);

        $group->positions()
            ->wherePivot('level', $validated['level'])
            ->detach($position->id);

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Jawatan berjaya dibuang.');
    }

    public function reorderGroupPositions(Request $request, CommitteeGroup $group): RedirectResponse
    {
        $validated = $request->validate([
            'positions' => ['required', 'array'],
            'positions.*.id' => ['required', 'exists:committee_positions,id'],
            'positions.*.sort_order' => ['required', 'integer', 'min:0'],
            'level' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
        ]);

        DB::transaction(function () use ($validated, $group) {
            foreach ($validated['positions'] as $item) {
                DB::table('committee_group_position')
                    ->where('committee_group_id', $group->id)
                    ->where('committee_position_id', $item['id'])
                    ->where('level', $validated['level'])
                    ->update(['sort_order' => $item['sort_order']]);
            }
        });

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Susunan jawatan berjaya dikemas kini.');
    }

    // ─── Memberships ──────────────────────────────────────────────

    public function storeMembership(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pemilih_record_id' => ['required', 'integer', Rule::exists('pemilih_records', 'id')],
            'committee_position_id' => ['required', 'integer', Rule::exists('committee_positions', 'id')],
            'committee_group_id' => ['required', 'integer', Rule::exists('committee_groups', 'id')],
            'level' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
            'scope_key' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $voter = PemilihRecord::query()->findOrFail($validated['pemilih_record_id']);

        if ($voter->status !== 'aktif' && ! $voter->is_manual) {
            return back()->withErrors([
                'pemilih_record_id' => 'Hanya pemilih aktif boleh dilantik.',
            ]);
        }

        [$scopeName, $parentScopeName] = $this->resolveScope(
            $validated['level'],
            $validated['scope_key'],
            $voter
        );

        $exists = CommitteeMembership::query()
            ->where('pemilih_record_id', $voter->id)
            ->where('committee_position_id', $validated['committee_position_id'])
            ->where('committee_group_id', $validated['committee_group_id'])
            ->where('level', $validated['level'])
            ->where('scope_key', $validated['scope_key'])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'committee_position_id' => 'Pelantikan yang sama sudah wujud untuk scope ini.',
            ]);
        }

        CommitteeMembership::query()->create([
            'committee_group_id' => $validated['committee_group_id'],
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $validated['committee_position_id'],
            'level' => $validated['level'],
            'scope_key' => $validated['scope_key'],
            'scope_name' => $scopeName,
            'parent_scope_name' => $parentScopeName,
            'created_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Ahli jawatankuasa berjaya ditambah.');
    }

    public function destroyMembership(Request $request, CommitteeMembership $membership): RedirectResponse
    {
        $user = $request->user();

        if ($user->isMasterAdmin() || $user->access_level === 'jprd') {
            $membership->delete();

            return redirect()
                ->route('jawatankuasa.index')
                ->with('success', 'Ahli jawatankuasa berjaya dibuang.');
        }

        $scope = $user->accessScope();

        if ($user->access_level === 'udm' && $scope !== null && filled($scope['dm'])) {
            $inScope = match ($membership->level) {
                'udm' => $membership->scope_key === $scope['dm'],
                'cawangan' => $membership->parent_scope_name === $scope['dm'],
                default => false,
            };

            if ($inScope) {
                $membership->delete();

                return redirect()
                    ->route('jawatankuasa.index')
                    ->with('success', 'Ahli jawatankuasa berjaya dibuang.');
            }
        }

        return redirect()
            ->route('jawatankuasa.index')
            ->with('error', 'Anda tidak mempunyai kebenaran untuk memadam rekod ini.');
    }

    // ─── Private ──────────────────────────────────────────────────

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
}
