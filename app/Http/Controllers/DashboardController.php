<?php

namespace App\Http\Controllers;

use App\Models\CopiedRecord;
use App\Models\SheetPage;
use App\Services\GoogleSheetService;
use Illuminate\Support\Collection;
use RuntimeException;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(GoogleSheetService $googleSheetService): Response
    {
        try {
            $sheet = $googleSheetService->fetchSheetData();
            $sheet['new_rows_available'] = $googleSheetService->countPendingNewRows($sheet);
        } catch (RuntimeException $exception) {
            $sheetUrl = $googleSheetService->getSheetUrl();

            $sheet = [
                'headers' => [],
                'rows' => [],
                'sheet_key' => md5($sheetUrl),
                'sheet_url' => $sheetUrl,
                'csv_url' => $googleSheetService->toCsvExportUrl($sheetUrl),
                'new_rows_available' => 0,
                'error' => $exception->getMessage(),
            ];
        }

        return Inertia::render('Dashboard', [
            'sheet' => $sheet,
            'pages' => $this->pagesForDashboard($sheet['sheet_key']),
        ]);
    }

    private function pagesForDashboard(string $sheetKey): array
    {
        $copiedRows = CopiedRecord::query()
            ->where('sheet_key', $sheetKey)
            ->get()
            ->keyBy('row_key');

        return SheetPage::query()
            ->with('rows')
            ->where('sheet_key', $sheetKey)
            ->whereNull('deleted_at')
            ->orderBy('page_number')
            ->get()
            ->map(fn (SheetPage $page) => $this->formatPage($page, $copiedRows))
            ->all();
    }

    private function formatPage(SheetPage $page, Collection $copiedRows): array
    {
        $rows = $page->rows
            ->map(function ($row) use ($copiedRows) {
                $copied = $copiedRows->get($row->row_key);

                return [
                    'id' => $row->id,
                    'row_key' => $row->row_key,
                    'position' => $row->position,
                    'copy_text' => '/kemascula ' . ($row->no_kp ?? ''),
                    'is_copied' => $copied !== null,
                    'copied_at' => $copied?->copied_at?->toDateTimeString(),
                    'values' => $row->payload,
                ];
            })
            ->values()
            ->all();

        return [
            'id' => $page->id,
            'page_number' => $page->page_number,
            'headers' => $page->headers ?? [],
            'rows' => $rows,
            'row_count' => count($rows),
            'created_at' => $page->created_at?->toDateTimeString(),
        ];
    }
}
