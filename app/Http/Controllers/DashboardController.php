<?php

namespace App\Http\Controllers;

use App\Services\GoogleSheetService;
use RuntimeException;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(GoogleSheetService $googleSheetService): Response
    {
        try {
            $sheet = $googleSheetService->fetchSheetData();
        } catch (RuntimeException $exception) {
            $sheet = [
                'headers' => [],
                'rows' => [],
                'sheet_key' => md5($googleSheetService->getSheetUrl()),
                'sheet_url' => $googleSheetService->getSheetUrl(),
                'csv_url' => $googleSheetService->toCsvExportUrl($googleSheetService->getSheetUrl()),
                'error' => $exception->getMessage(),
            ];
        }

        return Inertia::render('Dashboard', [
            'sheet' => $sheet,
        ]);
    }
}
