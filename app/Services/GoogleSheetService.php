<?php

namespace App\Services;

use App\Models\CopiedRecord;
use App\Models\Setting;
use App\Models\SheetPage;
use App\Models\SheetPageRow;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class GoogleSheetService
{
    public const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1AF1_jmW0e9kybpBbT6y4I6yHpAvScwSGj-Qb_ZEPsUU/edit?usp=drive_link';

    public function getSheetUrl(): string
    {
        return Setting::valueOf('google_sheet_url', self::DEFAULT_SHEET_URL);
    }

    public function updateSheetUrl(string $url): void
    {
        Setting::setValue('google_sheet_url', $url);
    }

    public function fetchSheetData(?string $url = null): array
    {
        $sheet = $this->fetchPreparedSheetData($url);
        $copiedRows = CopiedRecord::query()
            ->where('sheet_key', $sheet['sheet_key'])
            ->get()
            ->keyBy('row_key');

        $rows = collect($sheet['rows'])
            ->map(function (array $row) use ($copiedRows) {
                $copied = $copiedRows->get($row['row_key']);

                return [
                    'id' => $row['row_key'],
                    'row_key' => $row['row_key'],
                    'row_fingerprint' => $row['row_fingerprint'],
                    'position' => $row['position'],
                    'copy_text' => $row['copy_text'],
                    'is_copied' => $copied !== null,
                    'copied_at' => $copied?->copied_at?->toDateTimeString(),
                    'values' => $row['values'],
                ];
            })
            ->values()
            ->all();

        return [
            'headers' => $sheet['headers'],
            'rows' => $rows,
            'sheet_key' => $sheet['sheet_key'],
            'sheet_url' => $sheet['sheet_url'],
            'csv_url' => $sheet['csv_url'],
        ];
    }

    public function createNextPage(bool $requiresOnOffZero = false): ?SheetPage
    {
        $sheet = $this->fetchPreparedSheetData();

        if ($requiresOnOffZero && ! $this->isOnOffSheetEnabledForAuto($sheet['sheet_url'])) {
            return null;
        }

        $newRows = $this->extractUniqueNewRows($sheet);

        if ($newRows->isEmpty()) {
            return null;
        }

        return DB::transaction(function () use ($sheet, $newRows) {
            $page = SheetPage::query()->create([
                'sheet_key' => $sheet['sheet_key'],
                'page_number' => $this->nextPageNumber($sheet['sheet_key']),
                'headers' => $sheet['headers'],
                'source_total_rows' => count($sheet['rows']),
            ]);

            $page->rows()->createMany(
                $newRows->map(fn (array $row) => [
                    'sheet_key' => $sheet['sheet_key'],
                    'row_key' => $row['row_key'],
                    'row_fingerprint' => $row['row_fingerprint'],
                    'position' => $row['position'],
                    'payload' => $row['values'],
                    'no_kp' => $row['values']['no_kp'] ?? null,
                ])->all(),
            );

            return $page->load('rows');
        });
    }

    public function countPendingNewRows(array $sheet): int
    {
        return $this->extractUniqueNewRows($sheet)->count();
    }

    public function getOnOffStatus(?string $sheetUrl = null): array
    {
        $resolvedSheetUrl = $sheetUrl ?: $this->getSheetUrl();
        $value = $this->fetchOnOffSheetValue($resolvedSheetUrl);

        return [
            'value' => $value,
            'enabled' => $value === '0',
        ];
    }

    private function fetchPreparedSheetData(?string $url = null): array
    {
        $sheetUrl = $url ?: $this->getSheetUrl();
        $csvUrl = $this->toCsvExportUrl($sheetUrl);

        $response = Http::timeout(20)
            ->accept('text/csv')
            ->get($csvUrl);

        if ($response->failed()) {
            throw new RuntimeException('Gagal mendapatkan data daripada Google Sheet.');
        }

        $lines = array_values(array_filter(
            preg_split("/\r\n|\n|\r/", trim($response->body())) ?: [],
            fn (string $line) => trim($line) !== '',
        ));

        if ($lines === []) {
            return [
                'headers' => [],
                'rows' => [],
                'sheet_key' => md5($sheetUrl),
                'sheet_url' => $sheetUrl,
                'csv_url' => $csvUrl,
            ];
        }

        $headers = array_map(
            fn ($header) => Str::of((string) $header)->trim()->toString(),
            str_getcsv(array_shift($lines)),
        );

        return [
            'headers' => $headers,
            'rows' => collect($lines)
                ->map(function (string $line, int $index) use ($headers) {
                    $values = str_getcsv($line);
                    $row = [];

                    foreach ($headers as $headerIndex => $header) {
                        $row[$header] = trim((string) ($values[$headerIndex] ?? ''));
                    }

                    if (array_key_exists('no_kp', $row)) {
                        $row['no_kp'] = $this->normalizeNoKp($row['no_kp']);
                    }

                    $fingerprint = sha1(json_encode($row, JSON_UNESCAPED_UNICODE));

                    return [
                        'row_key' => $fingerprint,
                        'row_fingerprint' => $fingerprint,
                        'position' => $index + 1,
                        'copy_text' => '/kemascula '.($row['no_kp'] ?? ''),
                        'values' => $row,
                    ];
                })
                ->values()
                ->all(),
            'sheet_key' => md5($sheetUrl),
            'sheet_url' => $sheetUrl,
            'csv_url' => $csvUrl,
        ];
    }

    private function extractUniqueNewRows(array $sheet): Collection
    {
        $existingFingerprints = array_flip(
            SheetPageRow::query()
                ->where('sheet_key', $sheet['sheet_key'])
                ->pluck('row_fingerprint')
                ->all(),
        );

        return collect($sheet['rows'])
            ->unique('row_fingerprint')
            ->reject(fn (array $row) => isset($existingFingerprints[$row['row_fingerprint']]))
            ->values();
    }

    private function isOnOffSheetEnabledForAuto(string $sheetUrl): bool
    {
        return $this->fetchOnOffSheetValue($sheetUrl) === '0';
    }

    private function fetchOnOffSheetValue(string $sheetUrl): string
    {
        $response = Http::timeout(20)
            ->accept('text/csv')
            ->get($this->toSheetTabCsvUrl($sheetUrl, 'ON/OFF'));

        if ($response->failed()) {
            throw new RuntimeException('Gagal mendapatkan nilai daripada tab ON/OFF.');
        }

        $lines = preg_split("/\r\n|\n|\r/", trim($response->body())) ?: [];
        $value = collect($lines)
            ->flatMap(function (string $line) {
                return array_map(
                    fn ($cell) => trim((string) $cell),
                    str_getcsv($line),
                );
            })
            ->first(fn (string $cell) => preg_match('/^-?\d+$/', $cell) === 1);

        return (string) $value;
    }

    private function nextPageNumber(string $sheetKey): int
    {
        return (int) SheetPage::withTrashed()
            ->where('sheet_key', $sheetKey)
            ->max('page_number') + 1;
    }

    public function toCsvExportUrl(string $sheetUrl): string
    {
        if (str_contains($sheetUrl, '/export?format=csv')) {
            return $sheetUrl;
        }

        preg_match('/\/d\/([a-zA-Z0-9-_]+)/', $sheetUrl, $matches);

        if (! isset($matches[1])) {
            throw new RuntimeException('URL Google Sheet tidak sah.');
        }

        $gid = null;
        $queryString = parse_url($sheetUrl, PHP_URL_QUERY);

        if ($queryString) {
            parse_str($queryString, $queryParams);
            $gid = $queryParams['gid'] ?? null;
        }

        $baseUrl = 'https://docs.google.com/spreadsheets/d/'.$matches[1].'/export?format=csv';

        return $gid !== null ? $baseUrl.'&gid='.$gid : $baseUrl;
    }

    public function toSheetTabCsvUrl(string $sheetUrl, string $sheetName): string
    {
        preg_match('/\/d\/([a-zA-Z0-9-_]+)/', $sheetUrl, $matches);

        if (! isset($matches[1])) {
            throw new RuntimeException('URL Google Sheet tidak sah.');
        }

        return 'https://docs.google.com/spreadsheets/d/'
            .$matches[1]
            .'/gviz/tq?tqx=out:csv&sheet='
            .rawurlencode($sheetName);
    }

    private function normalizeNoKp(string $noKp): string
    {
        if ($noKp === '' || ! ctype_digit($noKp) || strlen($noKp) >= 12) {
            return $noKp;
        }

        return str_pad($noKp, 12, '0', STR_PAD_LEFT);
    }
}
