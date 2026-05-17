<?php

namespace App\Http\Controllers;

use App\Models\GroupPemilih;
use App\Models\PemilihRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GroupPemilihController extends Controller
{
    public function index(Request $request): Response
    {
        $groups = GroupPemilih::query()
            ->with('kodCulas')
            ->where('user_id', $request->user()->id)
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
                'sort_order' => $group->sort_order,
                'show_in_culaan_report' => $group->show_in_culaan_report,
                'kod_culas' => $group->kodCulas->pluck('kod_cula')->values(),
            ]);

        $availableKodCulas = PemilihRecord::query()
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->select('cula_code')
            ->distinct()
            ->orderBy('cula_code')
            ->pluck('cula_code')
            ->values();

        $availableKeturunans = PemilihRecord::query()
            ->whereNotNull('race')
            ->where('race', '!=', '')
            ->select('race')
            ->distinct()
            ->orderBy('race')
            ->pluck('race')
            ->values();

        return Inertia::render('GroupPemilih/Index', [
            'groups' => $groups,
            'availableKodCulas' => $availableKodCulas,
            'availableKeturunans' => $availableKeturunans,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama_group' => ['required', 'string', 'max:255'],
            'kod_culas' => ['nullable', 'array'],
            'kod_culas.*' => ['string', 'max:50'],
            'keturunan' => ['nullable', 'string', 'max:50'],
            'jantina' => ['nullable', 'string', 'max:50'],
            'umur_dari' => ['nullable', 'integer', 'min:0', 'max:150'],
            'umur_akhir' => ['nullable', 'integer', 'min:0', 'max:150'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $group = GroupPemilih::query()->create([
            'nama_group' => $validated['nama_group'],
            'keturunan' => $validated['keturunan'] ?: null,
            'jantina' => $validated['jantina'] ?: null,
            'umur_dari' => $validated['umur_dari'] !== null ? (int) $validated['umur_dari'] : null,
            'umur_akhir' => $validated['umur_akhir'] !== null ? (int) $validated['umur_akhir'] : null,
            'sort_order' => $validated['sort_order'] !== null ? (int) $validated['sort_order'] : 0,
            'user_id' => $request->user()->id,
        ]);

        if (! empty($validated['kod_culas'])) {
            $kodCulaData = collect($validated['kod_culas'])
                ->filter(fn ($v) => $v !== null && $v !== '')
                ->unique()
                ->map(fn ($kod) => ['kod_cula' => $kod])
                ->all();

            $group->kodCulas()->createMany($kodCulaData);
        }

        return redirect()
            ->route('group-pemilih.index')
            ->with('success', 'Group pemilih berjaya ditambah.');
    }

    public function update(Request $request, GroupPemilih $group): RedirectResponse
    {
        $this->ensureOwner($request->user()->id, $group);

        $validated = $request->validate([
            'nama_group' => ['required', 'string', 'max:255'],
            'kod_culas' => ['nullable', 'array'],
            'kod_culas.*' => ['string', 'max:50'],
            'keturunan' => ['nullable', 'string', 'max:50'],
            'jantina' => ['nullable', 'string', 'max:50'],
            'umur_dari' => ['nullable', 'integer', 'min:0', 'max:150'],
            'umur_akhir' => ['nullable', 'integer', 'min:0', 'max:150'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $group->update([
            'nama_group' => $validated['nama_group'],
            'keturunan' => $validated['keturunan'] ?: null,
            'jantina' => $validated['jantina'] ?: null,
            'umur_dari' => $validated['umur_dari'] !== null ? (int) $validated['umur_dari'] : null,
            'umur_akhir' => $validated['umur_akhir'] !== null ? (int) $validated['umur_akhir'] : null,
            'sort_order' => $validated['sort_order'] !== null ? (int) $validated['sort_order'] : 0,
        ]);

        $group->kodCulas()->delete();
        if (! empty($validated['kod_culas'])) {
            $kodCulaData = collect($validated['kod_culas'])
                ->filter(fn ($v) => $v !== null && $v !== '')
                ->unique()
                ->map(fn ($kod) => ['kod_cula' => $kod])
                ->all();

            $group->kodCulas()->createMany($kodCulaData);
        }

        return redirect()
            ->route('group-pemilih.index')
            ->with('success', 'Group pemilih berjaya dikemaskini.');
    }

    public function destroy(GroupPemilih $group): RedirectResponse
    {
        $this->ensureOwner(request()->user()->id, $group);
        $group->delete();

        return redirect()
            ->route('group-pemilih.index')
            ->with('success', 'Group pemilih berjaya dipadam.');
    }

    public function toggleCulaanReport(Request $request, GroupPemilih $group): RedirectResponse
    {
        $this->ensureOwner($request->user()->id, $group);

        $group->update([
            'show_in_culaan_report' => ! $group->show_in_culaan_report,
        ]);

        return redirect()
            ->route('group-pemilih.index')
            ->with('success', 'Paparan laporan culaan dikemaskini.');
    }

    private function ensureOwner(int $userId, GroupPemilih $group): void
    {
        abort_unless((int) $group->user_id === $userId, 403);
    }
}
