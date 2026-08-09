<?php

namespace App\Services;

use App\Models\ApiKey;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiKeyAuthenticator
{
    public function validate(Request $request): ?JsonResponse
    {
        $key = $request->query('key') ?? $request->bearerToken();

        if (! $key) {
            return response()->json(['error' => 'Kunci API diperlukan.'], 401);
        }

        $apiKey = ApiKey::query()->get()->first(function (ApiKey $storedKey) use ($key): bool {
            try {
                return $storedKey->key === $key;
            } catch (DecryptException) {
                return false;
            }
        });

        if (! $apiKey) {
            return response()->json(['error' => 'Kunci API tidak sah.'], 401);
        }

        if ($apiKey->expires_at && $apiKey->expires_at->isPast()) {
            return response()->json(['error' => 'Kunci API telah luput.'], 401);
        }

        $apiKey->update(['last_used_at' => now()]);

        return null;
    }
}
