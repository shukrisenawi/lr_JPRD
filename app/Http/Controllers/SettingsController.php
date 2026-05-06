<?php

namespace App\Http\Controllers;

use App\Services\GoogleSheetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(GoogleSheetService $googleSheetService): Response
    {
        return Inertia::render('Settings/Edit', [
            'settings' => [
                'google_sheet_url' => $googleSheetService->getSheetUrl(),
            ],
        ]);
    }

    public function update(Request $request, GoogleSheetService $googleSheetService): RedirectResponse
    {
        $validated = $request->validate([
            'google_sheet_url' => ['required', 'url'],
        ]);

        $googleSheetService->updateSheetUrl($validated['google_sheet_url']);

        return back()->with('success', 'Tetapan URL Google Sheet berjaya dikemaskini.');
    }
}
