<?php

namespace App\Services;

use App\Models\CopiedRecord;
use App\Models\Setting;
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

        $sheetKey = md5($sheetUrl);
        $copiedRows = CopiedRecord::query()
            ->where('sheet_key', $sheetKey)
            ->get()
            ->keyBy('row_key');

        $rows = collect($lines)
            ->map(function (string $line, int $index) use ($headers, $copiedRows) {
                $values = str_getcsv($line);
                $row = [];

                foreach ($headers as $headerIndex => $header) {
                    $row[$header] = trim((string) ($values[$headerIndex] ?? ''));
                }

                if (array_key_exists('no_kp', $row)) {
                    $row['no_kp'] = $this->normalizeNoKp($row['no_kp']);
                }

                $rowKey = sha1(json_encode($row, JSON_UNESCAPED_UNICODE) . '|' . $index);
                $copied = $copiedRows->get($rowKey);

                return [
                    'id' => $rowKey,
                    'position' => $index + 1,
                    'copy_text' => '/kemascula ' . ($row['no_kp'] ?? ''),
                    'is_copied' => $copied !== null,
                    'copied_at' => $copied?->copied_at?->toDateTimeString(),
                    'values' => $row,
                ];
            })
            ->values()
            ->all();

        return [
            'headers' => $headers,
            'rows' => $rows,
            'sheet_key' => $sheetKey,
            'sheet_url' => $sheetUrl,
            'csv_url' => $csvUrl,
        ];
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

        $baseUrl = 'https://docs.google.com/spreadsheets/d/' . $matches[1] . '/export?format=csv';

        return $gid ? $baseUrl . '&gid=' . $gid : $baseUrl;
    }

    private function normalizeNoKp(string $noKp): string
    {
        if ($noKp === '' || ! ctype_digit($noKp) || strlen($noKp) >= 12) {
            return $noKp;
        }

        return str_pad($noKp, 12, '0', STR_PAD_LEFT);
    }
}
