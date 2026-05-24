<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TambahPemilihController extends Controller
{
    public function index(): Response
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

        $manualVoters = PemilihRecord::where('is_manual', true)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('TambahPemilih/Index', [
            'dms' => $dms,
            'localitiesByDm' => $localitiesByDm,
            'manualVoters' => $manualVoters,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'no_kp' => 'nullable|string|max:20',
            'old_ic' => 'nullable|string|max:20',
            'name' => 'required|string|max:255',
            'dm' => 'nullable|string|max:255',
            'locality' => 'nullable|string|max:255',
            'gender' => 'nullable|string|max:20',
            'race' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'phone_home' => 'nullable|string|max:20',
            'phone_mobile' => 'nullable|string|max:20',
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
            return back()->withErrors(['no_kp' => 'Pemilih dengan no. IC ini sudah wujud dalam sistem.'])->withInput();
        }

        $validated['identity_number'] = $identityNumber;
        $validated['status'] = 'aktif';
        $validated['is_manual'] = true;

        PemilihRecord::create($validated);

        return redirect()->route('tambah-pemilih.index')
            ->with('success', 'Pemilih manual berjaya ditambah.');
    }
}
