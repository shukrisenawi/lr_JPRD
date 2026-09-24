<?php

namespace App\Http\Controllers;

use App\Models\Cawangan;
use App\Models\CommitteeMembership;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CawanganController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Cawangan', [
            'cawangans' => Cawangan::query()
                ->withCount([
                    'committeeMemberships as committee_members_count' => fn ($query) => $query->where('level', 'cawangan'),
                ])
                ->orderBy('udm')
                ->orderBy('name')
                ->get()
                ->map(fn (Cawangan $cawangan) => [
                    'id' => $cawangan->id,
                    'name' => $cawangan->name,
                    'udm' => $cawangan->udm,
                    'committee_members_count' => (int) $cawangan->committee_members_count,
                ])
                ->values(),
            'udms' => $this->availableUdms(),
            'legacy_scopes' => $this->legacyScopes()->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'udm' => trim((string) $request->input('udm')),
        ]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('cawangans', 'name')->where(fn ($query) => $query->where('udm', $request->input('udm'))),
            ],
            'udm' => ['required', 'string', 'max:255', Rule::in($this->availableUdms()->all())],
        ]);

        Cawangan::query()->create($validated);

        return redirect()
            ->route('admin.cawangan.index')
            ->with('success', 'Cawangan berjaya ditambah.');
    }

    public function update(Request $request, Cawangan $cawangan): RedirectResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'udm' => trim((string) $request->input('udm')),
        ]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('cawangans', 'name')
                    ->where(fn ($query) => $query->where('udm', $request->input('udm')))
                    ->ignore($cawangan->id),
            ],
            'udm' => ['required', 'string', 'max:255', Rule::in($this->availableUdms()->all())],
        ]);

        DB::transaction(function () use ($cawangan, $validated): void {
            $cawangan->update($validated);

            CommitteeMembership::query()
                ->where('cawangan_id', $cawangan->id)
                ->where('level', 'cawangan')
                ->update([
                    'scope_name' => $cawangan->name,
                    'parent_scope_name' => $cawangan->udm,
                ]);
        });

        return redirect()
            ->route('admin.cawangan.index')
            ->with('success', 'Cawangan berjaya dikemaskini.');
    }

    public function destroy(Cawangan $cawangan): RedirectResponse
    {
        if ($cawangan->committeeMemberships()->where('level', 'cawangan')->exists()) {
            return redirect()
                ->route('admin.cawangan.index')
                ->with('error', 'Cawangan yang mempunyai ahli jawatankuasa tidak boleh dipadam.');
        }

        if (User::query()->where('access_level', 'cawangan')->where('scope_key', (string) $cawangan->id)->exists()) {
            return redirect()
                ->route('admin.cawangan.index')
                ->with('error', 'Cawangan yang sedang digunakan sebagai skop pengguna tidak boleh dipadam.');
        }

        $cawangan->delete();

        return redirect()
            ->route('admin.cawangan.index')
            ->with('success', 'Cawangan berjaya dipadam.');
    }

    public function repair(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'repairs' => ['required', 'array', 'min:1'],
            'repairs.*.legacy_scope_key' => ['required', 'string', 'max:255'],
            'repairs.*.cawangan_id' => ['required', 'integer', Rule::exists('cawangans', 'id')],
        ]);

        $legacyScopes = $this->legacyScopes()->keyBy('key');
        $repairs = collect($validated['repairs'])->values();

        foreach ($repairs as $index => $repair) {
            $legacy = $legacyScopes->get($repair['legacy_scope_key']);
            if (! $legacy) {
                return back()->withErrors([
                    "repairs.{$index}.legacy_scope_key" => 'Lokaliti lama tidak dijumpai atau telah dibaiki.',
                ]);
            }

            $cawangan = Cawangan::query()->find($repair['cawangan_id']);
            if ($cawangan && filled($legacy['udm']) && $cawangan->udm !== $legacy['udm']) {
                return back()->withErrors([
                    "repairs.{$index}.cawangan_id" => 'Cawangan mesti berada di bawah UDM yang sama dengan lokaliti lama.',
                ]);
            }
        }

        $summary = DB::transaction(function () use ($repairs): array {
            $moved = 0;
            $merged = 0;
            $usersMigrated = 0;

            foreach ($repairs as $repair) {
                $cawangan = Cawangan::query()->lockForUpdate()->findOrFail($repair['cawangan_id']);
                $memberships = CommitteeMembership::query()
                    ->where('level', 'cawangan')
                    ->whereNull('cawangan_id')
                    ->where('scope_key', $repair['legacy_scope_key'])
                    ->lockForUpdate()
                    ->get();

                foreach ($memberships as $membership) {
                    $duplicate = CommitteeMembership::query()
                        ->where('id', '!=', $membership->id)
                        ->where('pemilih_record_id', $membership->pemilih_record_id)
                        ->where('committee_position_id', $membership->committee_position_id)
                        ->where('committee_group_id', $membership->committee_group_id)
                        ->where('level', 'cawangan')
                        ->where('cawangan_id', $cawangan->id)
                        ->first();

                    if ($duplicate) {
                        $membership->delete();
                        $merged++;

                        continue;
                    }

                    $membership->update([
                        'cawangan_id' => $cawangan->id,
                        'scope_key' => (string) $cawangan->id,
                        'scope_name' => $cawangan->name,
                        'parent_scope_name' => $cawangan->udm,
                    ]);
                    $moved++;
                }

                $usersMigrated += User::query()
                    ->where('access_level', 'cawangan')
                    ->where('scope_key', $repair['legacy_scope_key'])
                    ->update(['scope_key' => (string) $cawangan->id]);
            }

            return compact('moved', 'merged', 'usersMigrated');
        });

        $message = $summary['moved'].' ahli jawatankuasa berjaya dipindahkan ke cawangan baharu.';
        if ($summary['merged'] > 0) {
            $message .= ' '.$summary['merged'].' rekod pendua digabungkan.';
        }
        if ($summary['usersMigrated'] > 0) {
            $message .= ' '.$summary['usersMigrated'].' akses pengguna dikemas kini.';
        }

        return redirect()
            ->route('admin.cawangan.index')
            ->with('success', $message);
    }

    private function availableUdms()
    {
        return PemilihRecord::query()
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->merge(Cawangan::query()->pluck('udm'))
            ->filter(fn ($udm) => filled($udm))
            ->unique()
            ->sort()
            ->values();
    }

    private function legacyScopes()
    {
        return CommitteeMembership::query()
            ->where('level', 'cawangan')
            ->whereNull('cawangan_id')
            ->whereNotNull('scope_key')
            ->orderBy('parent_scope_name')
            ->orderBy('scope_name')
            ->get(['scope_key', 'scope_name', 'parent_scope_name'])
            ->groupBy('scope_key')
            ->map(function ($memberships, $scopeKey): array {
                $membership = $memberships->first();

                return [
                    'key' => (string) $scopeKey,
                    'name' => $membership->scope_name,
                    'udm' => $membership->parent_scope_name,
                    'members_count' => $memberships->count(),
                ];
            })
            ->sortBy(fn (array $scope) => [
                mb_strtolower((string) $scope['udm']),
                mb_strtolower((string) $scope['name']),
            ])
            ->values();
    }
}
