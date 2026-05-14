<?php

namespace App\Http\Controllers;

use App\Models\CommitteeMembership;
use App\Models\CommitteePosition;
use App\Models\PemilihRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CommitteeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Committee/Index', [
            'positions' => CommitteePosition::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (CommitteePosition $position) => [
                    'id' => $position->id,
                    'name' => $position->name,
                    'slug' => $position->slug,
                    'sort_order' => $position->sort_order,
                ])
                ->values(),
            'memberships' => CommitteeMembership::query()
                ->with(['position', 'voter'])
                ->orderBy('level')
                ->orderBy('scope_name')
                ->latest('id')
                ->get()
                ->map(fn (CommitteeMembership $membership) => [
                    'id' => $membership->id,
                    'level' => $membership->level,
                    'scope_key' => $membership->scope_key,
                    'scope_name' => $membership->scope_name,
                    'parent_scope_name' => $membership->parent_scope_name,
                    'position' => [
                        'id' => $membership->position?->id,
                        'name' => $membership->position?->name,
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
                'udm' => PemilihRecord::query()
                    ->where('status', 'aktif')
                    ->whereNotNull('dm')
                    ->where('dm', '!=', '')
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
                'cawangan' => PemilihRecord::query()
                    ->where('status', 'aktif')
                    ->whereNotNull('dm')
                    ->where('dm', '!=', '')
                    ->whereNotNull('locality')
                    ->where('locality', '!=', '')
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

    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([
                'suggestions' => [],
            ]);
        }

        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($query)) ?: []));

        $suggestions = PemilihRecord::query()
            ->where('status', 'aktif')
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
            })
            ->limit(8)
            ->get()
            ->map(fn (PemilihRecord $record) => [
                'id' => $record->id,
                'name' => $record->name,
                'no_kp' => $record->no_kp,
                'old_ic' => $record->old_ic,
                'phone_mobile' => $record->phone_mobile,
                'phone_home' => $record->phone_home,
                'dm' => $record->dm,
                'locality' => $record->locality,
                'status' => $record->status,
            ])
            ->values();

        return response()->json([
            'suggestions' => $suggestions,
        ]);
    }

    public function storePosition(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $names = $this->parsePositionNames($validated['name']);

        if ($names === []) {
            return back()->withErrors([
                'name' => 'Sila masukkan sekurang-kurangnya satu nama jawatan.',
            ]);
        }

        $duplicatesInInput = collect($names)
            ->map(fn (string $name) => mb_strtolower($name))
            ->duplicates()
            ->isNotEmpty();

        if ($duplicatesInInput) {
            return back()->withErrors([
                'name' => 'Nama jawatan yang sama tidak boleh diulang dalam senarai yang sama.',
            ]);
        }

        $existingNames = CommitteePosition::query()
            ->whereIn('name', $names)
            ->pluck('name')
            ->all();

        if ($existingNames !== []) {
            return back()->withErrors([
                'name' => 'Sebahagian nama jawatan sudah wujud: '.implode(', ', $existingNames),
            ]);
        }

        $baseSortOrder = $validated['sort_order'] ?? 0;

        foreach ($names as $index => $name) {
            CommitteePosition::query()->create([
                'name' => $name,
                'slug' => Str::slug($name),
                'sort_order' => $baseSortOrder + $index,
            ]);
        }

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Jenis jawatan berjaya ditambah.');
    }

    public function updatePosition(Request $request, CommitteePosition $position): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('committee_positions', 'name')->ignore($position->id)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $position->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Jenis jawatan berjaya dikemaskini.');
    }

    public function destroyPosition(CommitteePosition $position): RedirectResponse
    {
        if ($position->memberships()->exists()) {
            return redirect()
                ->route('jawatankuasa.index')
                ->with('error', 'Jenis jawatan yang sedang digunakan tidak boleh dipadam.');
        }

        $position->delete();

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Jenis jawatan berjaya dipadam.');
    }

    public function storeMembership(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pemilih_record_id' => ['required', 'integer', Rule::exists('pemilih_records', 'id')],
            'committee_position_id' => ['required', 'integer', Rule::exists('committee_positions', 'id')],
            'level' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
            'scope_key' => ['required', 'string', 'max:255'],
        ]);

        $voter = PemilihRecord::query()->findOrFail($validated['pemilih_record_id']);

        if ($voter->status !== 'aktif') {
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
            ->where('level', $validated['level'])
            ->where('scope_key', $validated['scope_key'])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'committee_position_id' => 'Pelantikan yang sama sudah wujud untuk scope ini.',
            ]);
        }

        CommitteeMembership::query()->create([
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $validated['committee_position_id'],
            'level' => $validated['level'],
            'scope_key' => $validated['scope_key'],
            'scope_name' => $scopeName,
            'parent_scope_name' => $parentScopeName,
        ]);

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Ahli jawatankuasa berjaya ditambah.');
    }

    public function destroyMembership(CommitteeMembership $membership): RedirectResponse
    {
        $membership->delete();

        return redirect()
            ->route('jawatankuasa.index')
            ->with('success', 'Ahli jawatankuasa berjaya dibuang.');
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

    private function parsePositionNames(string $value): array
    {
        return array_values(array_filter(array_map(
            fn (string $name) => trim($name),
            explode(',', $value)
        )));
    }
}
