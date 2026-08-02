<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use App\Models\PusatKhidmatData;
use App\Models\Setting;
use App\Services\PusatKhidmatService;
use App\Support\CulaCodes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PusatKhidmatController extends Controller
{
    public function index(PusatKhidmatService $service): Response
    {
        $data = $service->getRecords(request()->user());
        $lastSyncAt = Setting::valueOf('pusat_khidmat_last_sync_at');

        return Inertia::render('PusatKhidmat/Index', [
            'sheet_url' => $data['sheet_url'],
            'records' => $data['records'],
            'total_count' => $data['total_count'],
            'available_cula_codes' => $this->availableCulaCodes(),
            'udms' => $data['udms'],
            'localities' => $data['localities'],
            'last_sync_at' => $lastSyncAt,
        ]);
    }

    public function toggleCheck(PusatKhidmatData $record): JsonResponse
    {
        $isChecked = $record->checked_at !== null;

        $record->update([
            'checked_at' => $isChecked ? null : now(),
        ]);

        return response()->json([
            'ok' => true,
            'checked' => ! $isChecked,
            'checked_at' => $record->fresh()->checked_at?->toDateTimeString(),
        ]);
    }

    public function updateCula(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        $request->validate([
            'cula_code' => 'required|string',
            'cula_display_label' => 'required|string',
        ]);

        $pemilihRecord->update([
            'cula_code' => $request->input('cula_code'),
            'cula_display_label' => $request->input('cula_display_label'),
        ]);

        PusatKhidmatData::query()
            ->where('pemilih_record_id', $pemilihRecord->id)
            ->whereNull('checked_at')
            ->update(['checked_at' => now()]);

        return response()->json([
            'ok' => true,
            'message' => 'Kod culaan dikemaskini.',
            'pemilih_id' => $pemilihRecord->id,
        ]);
    }

    private function availableCulaCodes(): array
    {
        return CulaCodes::options();
    }

    public function sync(PusatKhidmatService $service): JsonResponse
    {
        try {
            $result = $service->fetchAndSync(request()->user());

            return response()->json([
                'ok' => true,
                'new_count' => $result['new_count'],
                'updated_count' => $result['updated_count'],
                'total_count' => $result['total_count'],
                'records' => $result['records'],
                'message' => $this->buildMessage($result),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateSheetUrl(Request $request, PusatKhidmatService $service): JsonResponse
    {
        $request->validate([
            'url' => 'required|url',
        ]);

        $service->updateSheetUrl($request->url);

        return response()->json([
            'ok' => true,
            'message' => 'URL Google Sheet dikemaskini.',
        ]);
    }

    private function buildMessage(array $result): string
    {
        $parts = [];

        if ($result['new_count'] > 0) {
            $parts[] = $result['new_count'].' rekod baru ditambah';
        }

        if ($result['updated_count'] > 0) {
            $parts[] = $result['updated_count'].' rekod dikemaskini';
        }

        if (empty($parts)) {
            return 'Tiada perubahan data.';
        }

        return implode(', ', $parts).'. Jumlah: '.$result['total_count'].' rekod.';
    }
}
