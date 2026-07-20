<?php

namespace App\Http\Controllers;

use App\Services\PusatKhidmatService;
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
        ]);
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
