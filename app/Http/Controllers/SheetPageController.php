<?php

namespace App\Http\Controllers;

use App\Models\SheetPage;
use App\Services\GoogleSheetService;
use Illuminate\Http\RedirectResponse;
use RuntimeException;

class SheetPageController extends Controller
{
    public function store(GoogleSheetService $googleSheetService): RedirectResponse
    {
        try {
            $page = $googleSheetService->createNextPage();
        } catch (RuntimeException $exception) {
            return redirect()
                ->route('dashboard')
                ->with('error', $exception->getMessage());
        }

        if ($page === null) {
            return redirect()
                ->route('dashboard')
                ->with('success', 'Tiada data baharu yang unik untuk dijadikan page baharu.');
        }

        return redirect()
            ->route('dashboard')
            ->with('success', "Page {$page->page_number} berjaya dicipta dengan data baharu yang unik.");
    }

    public function destroy(SheetPage $sheetPage): RedirectResponse
    {
        $sheetPage->delete();

        return redirect()
            ->route('dashboard')
            ->with('success', "Page {$sheetPage->page_number} berjaya dipadam.");
    }
}
