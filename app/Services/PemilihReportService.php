<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
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

        $cached = $this->readCachedReport($resolvedPath);

        if ($cached !== null) {
            return $cached;
        }

        $rows = $this->readRows($resolvedPath);

        $report = $this->summarize($rows, $resolvedPath);
        $this->writeCachedReport($resolvedPath, $report);

        return $report;
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
        $dmCula = [];
        $dmDetails = [];
        $localities = [];
        $gender = ['L' => 0, 'P' => 0, 'LAIN' => 0];
        $cula = [];

        foreach ($rows as $row) {
            $dmCode = $row['Kod DM'] ?? '';
            $dmName = $this->fallbackLabel($row['Nama DM'] ?? '', 'Tanpa DM');
            $localityCode = $row['Kod Lokaliti'] ?? '';
            $localityName = $this->fallbackLabel($row['Nama Lokaliti'] ?? '', 'Tanpa Lokaliti');
            $genderCode = strtoupper(trim((string) ($row['Jantina'] ?? '')));
            $raceCode = $this->fallbackLabel($row['Bangsa'] ?? '', 'Tiada');
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

            $dmCula[$dmKey] ??= [
                'code' => $dmCode,
                'name' => $dmName,
                'total' => 0,
                'cula_breakdown' => [],
            ];
            $dmCula[$dmKey]['total']++;
            $dmCula[$dmKey]['cula_breakdown'][$culaCode] ??= [
                'code' => $culaCode,
                'label' => $culaCode === 'Tiada' ? 'Tiada Kod' : 'Kod ' . $culaCode,
                'total' => 0,
            ];
            $dmCula[$dmKey]['cula_breakdown'][$culaCode]['total']++;

            $dmDetails[$dmKey] ??= [
                'code' => $dmCode,
                'name' => $dmName,
                'summary' => [
                    'total_voters' => 0,
                    'male' => 0,
                    'female' => 0,
                    'other_gender' => 0,
                    'with_cula' => 0,
                    'total_localities' => 0,
                ],
                'race_breakdown' => [],
                'localities' => [],
            ];
            $this->incrementSummary($dmDetails[$dmKey]['summary'], $genderKey, $culaCode);

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

            $dmDetails[$dmKey]['race_breakdown'][$raceCode] ??= [
                'code' => $raceCode,
                'label' => $raceCode,
                'total' => 0,
            ];
            $dmDetails[$dmKey]['race_breakdown'][$raceCode]['total']++;

            $dmDetails[$dmKey]['localities'][$localityKey] ??= [
                'code' => $localityCode,
                'name' => $localityName,
                'total' => 0,
                'male' => 0,
                'female' => 0,
                'other_gender' => 0,
                'with_cula' => 0,
                'race_breakdown' => [],
                'cula_breakdown' => [],
            ];
            $this->incrementGroup($dmDetails[$dmKey]['localities'][$localityKey], $genderKey, $culaCode);
            $dmDetails[$dmKey]['localities'][$localityKey]['race_breakdown'][$raceCode] ??= [
                'code' => $raceCode,
                'label' => $raceCode,
                'total' => 0,
            ];
            $dmDetails[$dmKey]['localities'][$localityKey]['race_breakdown'][$raceCode]['total']++;
            $dmDetails[$dmKey]['localities'][$localityKey]['cula_breakdown'][$culaCode] ??= [
                'code' => $culaCode,
                'label' => $culaCode === 'Tiada' ? 'Tiada Kod' : 'Kod ' . $culaCode,
                'total' => 0,
            ];
            $dmDetails[$dmKey]['localities'][$localityKey]['cula_breakdown'][$culaCode]['total']++;

            $cula[$culaCode] ??= [
                'code' => $culaCode,
                'label' => $culaCode === 'Tiada' ? 'Tiada Kod' : 'Kod ' . $culaCode,
                'total' => 0,
            ];
            $cula[$culaCode]['total']++;
        }

        $dmRows = $this->sortGroups($dm, 'name');
        $dmCulaRows = $this->sortDmCulaGroups($dmCula);
        $dmDetailRows = $this->sortDmDetailGroups($dmDetails);
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
            'cula_by_dm' => $dmCulaRows,
            'dm_details' => $dmDetailRows,
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

    private function incrementSummary(array &$summary, string $genderKey, string $culaCode): void
    {
        $summary['total_voters']++;

        match ($genderKey) {
            'L' => $summary['male']++,
            'P' => $summary['female']++,
            default => $summary['other_gender']++,
        };

        if ($culaCode !== 'Tiada') {
            $summary['with_cula']++;
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

    private function sortDmCulaGroups(array $groups): array
    {
        $rows = array_values($groups);

        foreach ($rows as &$row) {
            $row['cula_breakdown'] = $this->sortGroups($row['cula_breakdown'], 'code');
        }

        unset($row);

        usort($rows, function (array $first, array $second) {
            return $second['total'] <=> $first['total']
                ?: strnatcasecmp((string) $first['name'], (string) $second['name']);
        });

        return $rows;
    }

    private function sortDmDetailGroups(array $groups): array
    {
        $rows = array_values($groups);

        foreach ($rows as &$row) {
            $row['race_breakdown'] = $this->sortGroups($row['race_breakdown'], 'code');
            $row['localities'] = $this->sortLocalityDetailGroups($row['localities']);
            $row['summary']['total_localities'] = count($row['localities']);
        }

        unset($row);

        usort($rows, function (array $first, array $second) {
            return $second['summary']['total_voters'] <=> $first['summary']['total_voters']
                ?: strnatcasecmp((string) $first['name'], (string) $second['name']);
        });

        return $rows;
    }

    private function sortLocalityDetailGroups(array $groups): array
    {
        $rows = array_values($groups);

        foreach ($rows as &$row) {
            $row['race_breakdown'] = $this->sortGroups($row['race_breakdown'], 'code');
            $row['cula_breakdown'] = $this->sortGroups($row['cula_breakdown'], 'code');
        }

        unset($row);

        usort($rows, function (array $first, array $second) {
            return $second['total'] <=> $first['total']
                ?: strnatcasecmp((string) $first['name'], (string) $second['name']);
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
            'cula_by_dm' => [],
            'dm_details' => [],
            'by_locality' => [],
            'by_cula' => [],
        ];
    }

    private function readCachedReport(string $path): ?array
    {
        $cachePath = $this->cachePath($path);

        if (! File::exists($cachePath)) {
            return null;
        }

        $contents = File::get($cachePath);
        $decoded = json_decode($contents, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function writeCachedReport(string $path, array $report): void
    {
        $cachePath = $this->cachePath($path);
        File::ensureDirectoryExists(dirname($cachePath));
        File::put($cachePath, json_encode($report, JSON_UNESCAPED_UNICODE));
    }

    private function cachePath(string $path): string
    {
        $signature = sha1(implode('|', [
            $path,
            (string) filemtime($path),
            (string) filesize($path),
        ]));

        return storage_path('app/report-cache/' . $signature . '.json');
    }
}
