<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use App\Services\HashtagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PemilihHashtagController extends Controller
{
    public function suggestions(Request $request, HashtagService $hashtagService): JsonResponse
    {
        return response()->json([
            'hashtags' => $hashtagService->suggestions(
                $request->query('q'),
                $request->user(),
            ),
        ]);
    }

    public function update(Request $request, PemilihRecord $pemilihRecord, HashtagService $hashtagService): JsonResponse
    {
        $this->ensureCanManage($request, $pemilihRecord);

        $validated = $request->validate([
            'hashtags' => ['nullable', 'array', 'max:20'],
            'hashtags.*' => ['string', 'max:50', 'regex:/^#[\pL\pN_][\pL\pN_-]*$/u'],
        ]);

        return response()->json([
            'message' => 'Hashtag pemilih berjaya dikemaskini.',
            'hashtags' => $hashtagService->sync($pemilihRecord, $validated['hashtags'] ?? []),
        ]);
    }

    private function ensureCanManage(Request $request, PemilihRecord $pemilihRecord): void
    {
        $user = $request->user();

        abort_unless(
            $user?->isMasterAdmin()
                || $user?->canAccessModule('culaan.senarai')
                || $user?->canAccessModule('tambah-pemilih')
                || $user?->canAccessModule('carian-pemilih')
                || $user?->canAccessModule('hashtag-pemilih'),
            403,
        );

        $query = PemilihRecord::query()->whereKey($pemilihRecord->getKey());
        $user?->applyScopeToPemilihQuery($query);

        abort_unless($query->exists(), 403);
    }
}
