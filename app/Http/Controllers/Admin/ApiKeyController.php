<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ApiKeyController extends Controller
{
    public function index(): Response
    {
        abort_unless(request()->user()?->isMasterAdmin(), 403);

        return Inertia::render('Admin/ApiKeys', [
            'apiKeys' => ApiKey::query()
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (ApiKey $apiKey) => [
                    'id' => $apiKey->id,
                    'name' => $apiKey->name,
                    'key_preview' => substr($apiKey->key, 0, 12).'...',
                    'last_used_at' => $apiKey->last_used_at?->format('d-m-Y H:i'),
                    'expires_at' => $apiKey->expires_at?->format('d-m-Y'),
                    'created_at' => $apiKey->created_at->format('d-m-Y H:i'),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isMasterAdmin(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $plainText = Str::random(40);
        $hashed = hash('sha256', $plainText);

        ApiKey::query()->create([
            'name' => $validated['name'],
            'key' => $hashed,
            'expires_at' => $validated['expires_at'],
        ]);

        return redirect()
            ->route('admin.api-keys.index')
            ->with('success', 'Kunci API berjaya dicipta.')
            ->with('new_api_key', $plainText);
    }

    public function destroy(ApiKey $apiKey): RedirectResponse
    {
        abort_unless(request()->user()?->isMasterAdmin(), 403);

        $apiKey->delete();

        return redirect()
            ->route('admin.api-keys.index')
            ->with('success', 'Kunci API berjaya dipadam.');
    }
}
