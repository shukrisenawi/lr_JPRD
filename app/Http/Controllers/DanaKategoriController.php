<?php

namespace App\Http\Controllers;

use App\Models\Dana;
use App\Models\DanaKategori;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DanaKategoriController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->ensureCategoryAccess($request->user());
        $validated = $this->validateCategory($request);
        DanaKategori::query()->create($validated);

        return back()->with('success', 'Kategori dana berjaya ditambah.');
    }

    public function update(Request $request, DanaKategori $danaKategori): RedirectResponse
    {
        $this->ensureCategoryAccess($request->user());

        if ($danaKategori->is_other) {
            return back()->with('error', 'Kategori Lain-lain ialah kategori sistem dan tidak boleh diubah.');
        }

        $validated = $this->validateCategory($request, $danaKategori);
        $danaKategori->update($validated);

        return back()->with('success', 'Kategori dana berjaya dikemas kini.');
    }

    public function destroy(Request $request, DanaKategori $danaKategori): RedirectResponse
    {
        $this->ensureCategoryAccess($request->user());
        if ($danaKategori->is_other) {
            return back()->with('error', 'Kategori Lain-lain ialah kategori sistem dan tidak boleh dipadam.');
        }

        if (Dana::query()->where('kategori_id', $danaKategori->id)->exists()) {
            return back()->with('error', 'Kategori yang telah digunakan dalam rekod dana tidak boleh dipadam.');
        }

        $danaKategori->delete();

        return back()->with('success', 'Kategori dana berjaya dipadam.');
    }

    private function ensureCategoryAccess(?User $user): void
    {
        abort_unless($user?->isMasterAdmin() || in_array('dana.kategori', $user?->role?->access_modules ?? [], true), 403);
    }

    private function validateCategory(Request $request, ?DanaKategori $danaKategori = null): array
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
        ]);

        $uniqueName = Rule::unique('dana_kategori', 'name');
        if ($danaKategori) {
            $uniqueName->ignore($danaKategori->id);
        }

        return $request->validate([
            'name' => ['required', 'string', 'max:100', $uniqueName],
        ], [
            'name.unique' => 'Nama kategori ini sudah digunakan.',
        ]);
    }
}
