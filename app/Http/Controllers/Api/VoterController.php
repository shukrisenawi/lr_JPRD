<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\PemilihRecord;
use Carbon\Carbon;
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

        $date = $request->query('date')
            ? Carbon::parse($request->query('date'))->timezone('Asia/Kuala_Lumpur')
            : now()->timezone('Asia/Kuala_Lumpur');

        $month = $date->month;
        $day = $date->day;

        $voters = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereNotNull('date_of_birth')
            ->whereMonth('date_of_birth', $month)
            ->whereDay('date_of_birth', $day)
            ->where(function ($q) {
                $q->whereNotNull('phone_home')->where('phone_home', '!=', '')
                  ->orWhereNotNull('phone_mobile')->where('phone_mobile', '!=', '');
            })
            ->orderBy('name')
            ->get()
            ->map(fn (PemilihRecord $voter) => [
                'name' => $voter->name,
                'ic_number' => $voter->no_kp,
                'no_telefon' => $voter->phone_mobile
                    ? preg_replace('/[^0-9]/', '', $voter->phone_mobile)
                    : ($voter->phone_home ? preg_replace('/[^0-9]/', '', $voter->phone_home) : null),
                'date_of_birth' => $voter->date_of_birth?->format('Y-m-d'),
                'birthday_url' => $voter->birthdayImageUrl(),
            ]);

        return response()->json([
            'data' => $voters,
            'total' => $voters->count(),
        ]);
    }
}
