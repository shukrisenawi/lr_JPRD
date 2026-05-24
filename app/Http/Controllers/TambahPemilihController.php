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
        return Inertia::render('TambahPemilih/Index');
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

        $exists = PemilihRecord::where('identity_number', $identityNumber)->exists();
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
