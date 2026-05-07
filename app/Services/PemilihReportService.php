<?php

namespace App\Services;

use RuntimeException;

class PemilihReportService
{
    public const DEFAULT_SAMPLE_PATH = 'F:\\OneDrive\\PAS\\pemilih.xls';

    public function buildFromPath(?string $path = null): array
    {
        $resolvedPath = $path ?: self::DEFAULT_SAMPLE_PATH;

        if (! is_string($resolvedPath) || ! file_exists($resolvedPath)) {
            return $this->emptyReport($resolvedPath);
        }

        $rows = $this->readRows($resolvedPath);

        return $this->summarize($rows, $resolvedPath);
    }

    private function readRows(string $path): array
    {
        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException('Fail laporan tidak dapat dibaca.');
        }

        if (str_contains(strtolower(substr($contents, 0, 500)), '<table')) {
            return $this->readHtmlTableRows($contents);
        }

        return $this->readSpreadsheetRows($path);
    }

    private function readHtmlTableRows(string $html): array
    {
        libxml_use_internal_errors(true);

        $dom = new \DOMDocument();
        $dom->loadHTML($html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_COMPACT);

        $headers = [];
        $rows = [];

        foreach ($dom->getElementsByTagName('tr') as $tableRow) {
            $cells = [];

            foreach ($tableRow->childNodes as $cell) {
                if (! $cell instanceof \DOMElement) {
                    continue;
                }

                if (! in_array(strtolower($cell->tagName), ['td', 'th'], true)) {
                    continue;
                }

                $cells[] = $this->cleanCell($cell->textContent);
            }

            if ($cells === []) {
                continue;
            }

            if ($headers === []) {
                $headers = array_map(fn (string $header) => $this->normalizeHeader($header), $cells);
                continue;
            }

            $rows[] = $this->combineRow($headers, $cells);
        }

        return $rows;
    }

    private function readSpreadsheetRows(string $path): array
    {
        require_once base_path('vendor/nuovo/spreadsheet-reader/SpreadsheetReader.php');

        $reader = new \SpreadsheetReader($path);
        $headers = [];
        $rows = [];

        foreach ($reader as $sheetRow) {
            $cells = array_map(fn ($cell) => $this->cleanCell((string) $cell), $sheetRow);

            if ($cells === [] || count(array_filter($cells, fn (string $cell) => $cell !== '')) === 0) {
                continue;
            }

            if ($headers === []) {
                $headers = array_map(fn (string $header) => $this->normalizeHeader($header), $cells);
                continue;
            }

            $rows[] = $this->combineRow($headers, $cells);
        }

        return $rows;
    }

    private function summarize(array $rows, string $path): array
    {
        $dm = [];
        $localities = [];
        $gender = ['L' => 0, 'P' => 0, 'LAIN' => 0];
        $cula = [];

        foreach ($rows as $row) {
            $dmCode = $row['Kod DM'] ?? '';
            $dmName = $this->fallbackLabel($row['Nama DM'] ?? '', 'Tanpa DM');
            $localityCode = $row['Kod Lokaliti'] ?? '';
            $localityName = $this->fallbackLabel($row['Nama Lokaliti'] ?? '', 'Tanpa Lokaliti');
            $genderCode = strtoupper(trim((string) ($row['Jantina'] ?? '')));
            $culaCode = $this->fallbackLabel($row['Kod Cula'] ?? '', 'Tiada');

            $genderKey = in_array($genderCode, ['L', 'P'], true) ? $genderCode : 'LAIN';
            $gender[$genderKey]++;

            $dmKey = $dmCode . '|' . $dmName;
            $dm[$dmKey] ??= [
                'code' => $dmCode,
                'name' => $dmName,
                'total' => 0,
                'male' => 0,
                'female' => 0,
                'other_gender' => 0,
                'with_cula' => 0,
            ];
            $this->incrementGroup($dm[$dmKey], $genderKey, $culaCode);

            $localityKey = $localityCode . '|' . $localityName . '|' . $dmName;
            $localities[$localityKey] ??= [
                'code' => $localityCode,
                'name' => $localityName,
                'dm' => $dmName,
                'total' => 0,
                'male' => 0,
                'female' => 0,
                'other_gender' => 0,
                'with_cula' => 0,
            ];
            $this->incrementGroup($localities[$localityKey], $genderKey, $culaCode);

            $cula[$culaCode] ??= [
                'code' => $culaCode,
                'label' => $culaCode === 'Tiada' ? 'Tiada Kod' : 'Kod ' . $culaCode,
                'total' => 0,
            ];
            $cula[$culaCode]['total']++;
        }

        $dmRows = $this->sortGroups($dm, 'name');
        $localityRows = $this->sortGroups($localities, 'name');
        $culaRows = $this->sortGroups($cula, 'code');

        return [
            'source' => [
                'name' => basename($path),
                'exists' => true,
            ],
            'summary' => [
                'total_voters' => count($rows),
                'total_dm' => count($dmRows),
                'total_localities' => count($localityRows),
                'male' => $gender['L'],
                'female' => $gender['P'],
                'other_gender' => $gender['LAIN'],
                'with_cula' => count(array_filter($rows, fn (array $row) => trim((string) ($row['Kod Cula'] ?? '')) !== '')),
            ],
            'gender' => [
                ['key' => 'L', 'label' => 'Lelaki', 'total' => $gender['L']],
                ['key' => 'P', 'label' => 'Perempuan', 'total' => $gender['P']],
                ['key' => 'LAIN', 'label' => 'Lain-lain', 'total' => $gender['LAIN']],
            ],
            'by_dm' => $dmRows,
            'by_locality' => $localityRows,
            'by_cula' => $culaRows,
        ];
    }

    private function incrementGroup(array &$group, string $genderKey, string $culaCode): void
    {
        $group['total']++;

        match ($genderKey) {
            'L' => $group['male']++,
            'P' => $group['female']++,
            default => $group['other_gender']++,
        };

        if ($culaCode !== 'Tiada') {
            $group['with_cula']++;
        }
    }

    private function sortGroups(array $groups, string $secondaryKey): array
    {
        $rows = array_values($groups);

        usort($rows, function (array $first, array $second) use ($secondaryKey) {
            return $second['total'] <=> $first['total']
                ?: strnatcasecmp((string) $first[$secondaryKey], (string) $second[$secondaryKey]);
        });

        return $rows;
    }

    private function combineRow(array $headers, array $cells): array
    {
        $cells = array_slice(array_pad($cells, count($headers), ''), 0, count($headers));

        return array_combine($headers, array_map(fn (string $cell) => $this->cleanCell($cell), $cells)) ?: [];
    }

    private function normalizeHeader(string $header): string
    {
        return preg_replace('/\s+/', ' ', $this->cleanCell($header)) ?? '';
    }

    private function cleanCell(string $value): string
    {
        $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $value = str_replace("\xc2\xa0", ' ', $value);
        $value = trim($value);

        if (preg_match('/^="(.*)"$/s', $value, $matches) === 1) {
            $value = $matches[1];
        }

        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }

    private function fallbackLabel(string $value, string $fallback): string
    {
        $value = trim($value);

        return $value === '' ? $fallback : $value;
    }

    private function emptyReport(?string $path): array
    {
        return [
            'source' => [
                'name' => $path ? basename($path) : null,
                'exists' => false,
            ],
            'summary' => [
                'total_voters' => 0,
                'total_dm' => 0,
                'total_localities' => 0,
                'male' => 0,
                'female' => 0,
                'other_gender' => 0,
                'with_cula' => 0,
            ],
            'gender' => [],
            'by_dm' => [],
            'by_locality' => [],
            'by_cula' => [],
        ];
    }
}
