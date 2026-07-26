<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\PemilihRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoterController extends Controller
{
    public function birthdays(Request $request): JsonResponse
    {
        $key = $request->query('key') ?? $request->bearerToken();

        if (! $key) {
            return response()->json(['error' => 'Kunci API diperlukan.'], 401);
        }

        $apiKey = ApiKey::query()->get()->first(fn (ApiKey $k) => $k->key === $key);

        if (! $apiKey) {
            return response()->json(['error' => 'Kunci API tidak sah.'], 401);
        }

        if ($apiKey->expires_at && $apiKey->expires_at->isPast()) {
            return response()->json(['error' => 'Kunci API telah luput.'], 401);
        }

        $apiKey->update(['last_used_at' => now()]);

        $voters = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereNotNull('birthday_image')
            ->where('birthday_image', '!=', '')
            ->orderBy('name')
            ->get()
            ->map(fn (PemilihRecord $voter) => [
                'name' => $voter->name,
                'ic_number' => $voter->no_kp,
                'birthday' => $voter->birthday,
                'birthday_url' => $voter->birthdayImageUrl(),
            ]);

        return response()->json([
            'data' => $voters,
            'total' => $voters->count(),
        ]);
    }
}
