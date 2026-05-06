<?php

namespace App\Http\Controllers;

use App\Models\SheetPage;
use App\Services\GoogleSheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;

class SheetPageController extends Controller
{
    public function store(Request $request, GoogleSheetService $googleSheetService): RedirectResponse|JsonResponse
    {
        $isAutoSync = $request->boolean('silent');

        try {
            $page = $googleSheetService->createNextPage($isAutoSync);
        } catch (RuntimeException $exception) {
            if ($this->wantsJson($request)) {
                return response()->json([
                    'status' => 'error',
                    'message' => $exception->getMessage(),
                ], 422);
            }

            return redirect()
                ->route('dashboard')
                ->with('error', $exception->getMessage());
        }

        if ($page === null) {
            if ($this->wantsJson($request)) {
                return response()->json([
                    'status' => 'no_changes',
                    'message' => $isAutoSync
                        ? 'Tiada data baharu unik dengan nilai ON/OFF = 0 untuk dijadikan page baharu.'
                        : 'Tiada data baharu yang unik untuk dijadikan page baharu.',
                ]);
            }

            return redirect()
                ->route('dashboard')
                ->with(
                    'success',
                    $isAutoSync
                        ? 'Tiada data baharu unik dengan nilai ON/OFF = 0 untuk dijadikan page baharu.'
                        : 'Tiada data baharu yang unik untuk dijadikan page baharu.'
                );
        }

        if ($this->wantsJson($request)) {
            return response()->json([
                'status' => 'created',
                'message' => "Page {$page->page_number} berjaya dicipta dengan data baharu yang unik.",
                'page_number' => $page->page_number,
            ]);
        }

        return redirect()
            ->route('dashboard')
            ->with('success', "Page {$page->page_number} berjaya dicipta dengan data baharu yang unik.");
    }

    public function destroy(SheetPage $sheetPage): RedirectResponse
    {
        $sheetPage->rows()->delete();
        $sheetPage->delete();

        return redirect()
            ->route('dashboard')
            ->with('success', "Page {$sheetPage->page_number} berjaya dipadam.");
    }

    private function wantsJson(Request $request): bool
    {
        return $request->expectsJson() || $request->boolean('silent');
    }
}
