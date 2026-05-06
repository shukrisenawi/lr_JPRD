<?php

namespace App\Http\Controllers;

use App\Models\CopiedRecord;
use App\Services\GoogleSheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CopiedRecordController extends Controller
{
    public function store(Request $request, GoogleSheetService $googleSheetService): JsonResponse
    {
        $validated = $request->validate([
            'row_key' => ['required', 'string'],
            'no_kp' => ['nullable', 'string'],
        ]);

        CopiedRecord::query()->updateOrCreate(
            [
                'sheet_key' => md5($googleSheetService->getSheetUrl()),
                'row_key' => $validated['row_key'],
            ],
            [
                'no_kp' => $validated['no_kp'] ?? null,
                'copied_at' => now(),
            ],
        );

        return response()->json([
            'message' => 'Status salinan berjaya direkodkan.',
        ]);
    }
}
