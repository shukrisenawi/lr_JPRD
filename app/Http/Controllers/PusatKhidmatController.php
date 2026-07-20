<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use App\Models\User;
use App\Services\PusatKhidmatService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class PusatKhidmatController extends Controller
{
    public function index(PusatKhidmatService $service): Response
    {
        $data = $service->getRecords();

        return Inertia::render('PusatKhidmat/Index', [
            'sheet_url' => $data['sheet_url'],
            'records' => $data['records'],
            'total_count' => $data['total_count'],
            'available_cula_codes' => $this->availableCulaCodes(),
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

        return response()->json([
            'ok' => true,
            'message' => 'Kod culaan dikemaskini.',
            'pemilih_id' => $pemilihRecord->id,
        ]);
    }

    private function availableCulaCodes(): array
    {
        /** @var Builder $query */
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '');

        $user = request()->user();
        if ($user instanceof User) {
            $user->applyScopeToPemilihQuery($query);
        }

        $rows = $query
            ->select('cula_code', \Illuminate\Support\Facades\DB::raw('MAX(cula_display_label) as display_label'))
            ->groupBy('cula_code')
            ->orderBy('cula_code')
            ->get();

        return collect($rows)
            ->map(fn ($r) => [
                'code' => $r->cula_code,
                'label' => $r->display_label,
            ])
            ->values()
            ->all();
    }

    public function sync(PusatKhidmatService $service): \Illuminate\Http\JsonResponse
    {
        try {
            $result = $service->fetchAndSync();

            return response()->json([
                'ok' => true,
                'new_count' => $result['new_count'],
                'updated_count' => $result['updated_count'],
                'total_count' => $result['total_count'],
                'records' => $result['records'],
                'message' => $this->buildMessage($result),
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateSheetUrl(Request $request, PusatKhidmatService $service): \Illuminate\Http\JsonResponse
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
            $parts[] = $result['new_count'] . ' rekod baru ditambah';
        }

        if ($result['updated_count'] > 0) {
            $parts[] = $result['updated_count'] . ' rekod dikemaskini';
        }

        if (empty($parts)) {
            return 'Tiada perubahan data.';
        }

        return implode(', ', $parts) . '. Jumlah: ' . $result['total_count'] . ' rekod.';
    }
}
