<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class TambahPemilihController extends Controller
{
    private function isMasterAdmin(Request $request): bool
    {
        return $request->user()->role?->is_master_admin === true;
    }

    public function index(Request $request): Response
    {
        $dms = PemilihRecord::whereNotNull('dm')
            ->where('dm', '!=', '-')
            ->where('status', 'aktif')
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->toArray();

        $localitiesByDm = [];
        foreach ($dms as $dm) {
            $localitiesByDm[$dm] = PemilihRecord::where('dm', $dm)
                ->whereNotNull('locality')
                ->where('locality', '!=', '-')
                ->where('status', 'aktif')
                ->select('locality')
                ->distinct()
                ->orderBy('locality')
                ->pluck('locality')
                ->toArray();
        }

        $culaCodes = PemilihRecord::whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->select('cula_code', 'cula_display_label')
            ->distinct()
            ->orderBy('cula_code')
            ->get()
            ->toArray();

        $manualVoters = PemilihRecord::where('is_manual', true)
            ->with('creator:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('TambahPemilih/Index', [
            'dms' => $dms,
            'localitiesByDm' => $localitiesByDm,
            'culaCodes' => $culaCodes,
            'manualVoters' => $manualVoters,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'no_kp' => 'nullable|string|max:20',
            'old_ic' => 'nullable|string|max:20',
            'no_ahli' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'dm' => 'nullable|string|max:255',
            'locality' => 'nullable|string|max:255',
            'gender' => 'nullable|string|max:20',
            'race' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'phone_home' => 'nullable|string|max:20',
            'phone_mobile' => 'nullable|string|max:20',
            'cula_code' => 'nullable|string|max:50',
            'cula_display_label' => 'nullable|string|max:255',
        ]);

        $identityNumber = $validated['no_kp'] ?? $validated['old_ic'] ?? '';
        if ($identityNumber === '') {
            return back()->withErrors(['no_kp' => 'No. KP Baru atau No. KP Lama wajib diisi.'])->withInput();
        }

        $exists = PemilihRecord::where(function ($q) use ($validated) {
            if (!empty($validated['no_kp'])) {
                $q->where('identity_number', $validated['no_kp'])
                  ->orWhere('no_kp', $validated['no_kp'])
                  ->orWhere('old_ic', $validated['no_kp']);
            }
            if (!empty($validated['old_ic'])) {
                $q->orWhere('identity_number', $validated['old_ic'])
                  ->orWhere('no_kp', $validated['old_ic'])
                  ->orWhere('old_ic', $validated['old_ic']);
            }
        })->exists();

        if ($exists) {
            return back()->withErrors(['no_kp' => 'Pemilih dengan No Kp ini sudah wujud dalam sistem.'])->withInput();
        }

        $validated['identity_number'] = $identityNumber;
        $validated['status'] = 'aktif';
        $validated['is_manual'] = true;
        $validated['created_by'] = $request->user()->id;

        PemilihRecord::create($validated);

        return redirect()->route('tambah-pemilih.index');
    }

    public function update(Request $request, PemilihRecord $pemilihRecord): RedirectResponse
    {
        if (!$pemilihRecord->is_manual) {
            abort(403);
        }
        if (!$this->isMasterAdmin($request) && $pemilihRecord->created_by !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'no_kp' => 'nullable|string|max:20',
            'old_ic' => 'nullable|string|max:20',
            'no_ahli' => 'nullable|string|max:255',
            'phone_mobile' => 'nullable|string|max:20',
            'phone_home' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'dm' => 'nullable|string|max:255',
            'locality' => 'nullable|string|max:255',
            'gender' => 'nullable|string|max:20',
            'race' => 'nullable|string|max:50',
            'cula_code' => 'nullable|string|max:50',
            'cula_display_label' => 'nullable|string|max:255',
        ]);

        $identityNumber = $validated['no_kp'] ?? $validated['old_ic'] ?? '';
        if ($identityNumber !== '') {
            $validated['identity_number'] = $identityNumber;
        }

        $pemilihRecord->update($validated);

        return redirect()->route('tambah-pemilih.index');
    }

    public function destroy(Request $request, PemilihRecord $pemilihRecord): RedirectResponse
    {
        if (!$pemilihRecord->is_manual) {
            abort(403);
        }
        if (!$this->isMasterAdmin($request) && $pemilihRecord->created_by !== $request->user()->id) {
            abort(403);
        }

        $pemilihRecord->delete();

        return redirect()->route('tambah-pemilih.index');
    }
}
