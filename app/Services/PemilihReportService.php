<?php

namespace App\Services;

use App\Models\CulaWorkItem;
use App\Models\PemilihRecord;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;

class PemilihReportService
{
    public const DEFAULT_SAMPLE_PATH = 'F:\\OneDrive\\PAS\\pemilih.xls';

    private const REPORT_SCHEMA_VERSION = 3;

    private const CULA_LABELS = [
        '1' => 'UMNO',
        '10' => 'PPBM',
        '11' => 'GERAKAN',
        '12' => 'PEJUANG',
        '13' => 'MCA',
        '14' => 'MIC',
        '15' => 'PUTRA',
        '16' => 'MUDA',
        '1A' => 'UMNO - SASARAN / LEMAH / ATAS PAGAR',
        '1B' => 'UMNO SOKONG PAS',
        '1P' => 'UMNO SOKONG PN (TIDAK SOKONG PAS)',
        '2' => 'PAS',
        '3B' => 'PAS LUAR KEDAH (BORNEO)',
        '3D' => 'PAS LUAR DUN',
        '3K' => 'PAS LUAR KEDAH (SEMENANJUNG)',
        '3M' => 'PAS LUAR MALAYSIA',
        '3P' => 'PAS LUAR PARLIMEN',
        '3U' => 'PAS LUAR UDM',
        '4' => 'ATAS PAGAR',
        '4P' => 'ATAS PAGAR SOKONG PN',
        '5' => 'PKR',
        '6' => 'DHPP',
        '7' => 'TIDAK DIKENALI',
        '7P' => 'TIDAK DIKENALI (POLIS / TENTERA)',
        '8' => 'MATI',
        '9' => 'PAN DAP',
        '97' => 'LAIN-LAIN BANGSA',
        '98' => 'INDIA',
        '99' => 'CINA',
        '?' => 'BELUM DICULA',
    ];

    public function buildFromPath(?string $path = null): array
    {
        $resolvedPath = $path ?: self::DEFAULT_SAMPLE_PATH;

        if (! is_string($resolvedPath) || ! file_exists($resolvedPath)) {
            return $this->emptyReport($resolvedPath);
        }

        $cachedReport = $this->readCachedReport($resolvedPath);

        if ($cachedReport !== null) {
            return $cachedReport;
        }

        $legacySnapshot = $this->readLegacySnapshot($resolvedPath);
        $legacyReport = $this->extractReportFromLegacySnapshot($legacySnapshot);

        if ($legacyReport !== null) {
            $this->writeCachedReport($resolvedPath, $legacyReport);

            $legacySearchIndex = $this->extractSearchIndexFromLegacySnapshot($legacySnapshot);

            if ($legacySearchIndex !== null) {
                $this->writeCachedSearchIndex($resolvedPath, $legacySearchIndex);
            }

            return $legacyReport;
        }

        $rows = $this->readRows($resolvedPath);
        $report = $this->summarize($rows, $resolvedPath);
        $this->writeCachedReport($resolvedPath, $report);

        return $report;
    }

    public function buildFromDatabase(): array
    {
        $records = PemilihRecord::query()->where('status', '!=', 'xaktif')->get();

        if ($records->isEmpty()) {
            return $this->emptyReport('database');
        }

        $rows = $records->map(function (PemilihRecord $r) {
            $dm = $r->dm ?: 'Tanpa DM';
            $loc = $r->locality ?: 'Tanpa Lokaliti';

            return [
                'Kod DM' => $dm,
                'Nama DM' => $dm,
                'Kod Lokaliti' => $loc,
                'Nama Lokaliti' => $loc,
                'Jantina' => $r->gender ?? '',
                'Bangsa' => $r->race ?? '',
                'Kod Cula' => $r->cula_code ?? '',
            ];
        })->all();

        $report = $this->summarize($rows, 'database');
        $report['source'] = [
            'name' => 'Pangkalan Data',
            'exists' => true,
        ];

        $completedCounts = PemilihRecord::query()
            ->where('status', '!=', 'xaktif')
            ->whereHas('culaWorkItem')
            ->select('dm')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('dm')
            ->pluck('total', 'dm')
            ->toArray();

        $report['completed_by_dm'] = $completedCounts;

        $completedCulaByDm = PemilihRecord::query()
            ->where('status', '!=', 'xaktif')
            ->whereHas('culaWorkItem')
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->where('cula_code', '!=', 'TIADA')
            ->select('dm', 'cula_code')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('dm', 'cula_code')
            ->get()
            ->groupBy('dm')
            ->map(fn ($items) => $items->pluck('total', 'cula_code')->map(fn ($v) => (int) $v)->toArray())
            ->toArray();

        $report['completed_cula_by_dm'] = $completedCulaByDm;

        return $report;
    }

    public function searchVoters(string $query, ?string $path = null, int $limit = 8, ?\App\Models\User $user = null, ?string $dm = null, ?string $locality = null): array
    {
        $normalizedQuery = $this->normalizeSearch($query);

        if ($normalizedQuery === '') {
            return [];
        }

        if (PemilihRecord::query()->count() > 0) {
            return $this->searchVotersFromDb($normalizedQuery, $query, $limit, $user, $dm, $locality);
        }

        $voters = $this->searchIndexForPath($path);
        $matches = [];

        foreach ($voters as $voter) {
            if (! str_contains($voter['search_blob'], $normalizedQuery)) {
                continue;
            }

            $matches[] = [
                'id' => $voter['id'],
                'voter_id' => $voter['id'],
                'name' => $voter['name'],
                'no_kp' => $voter['no_kp'],
                'old_ic' => $voter['old_ic'],
                'no_ahli' => $voter['no_ahli'] ?? null,
                'age' => $this->calculateAge($voter['no_kp']),
                'phone_mobile' => $voter['phone_mobile'],
                'phone_home' => $voter['phone_home'],
                'dm' => $voter['dm'],
                'locality' => $voter['locality'],
                'gender' => $voter['gender'],
                'race' => $voter['race'],
                'cula_code' => $voter['cula_code'],
                'cula_display_label' => $voter['cula_display_label'],
                'address' => $voter['address'],
            ];

            if (count($matches) >= $limit) {
                break;
            }
        }

        return $matches;
    }

    private function searchVotersFromDb(string $normalizedQuery, string $rawQuery, int $limit, ?\App\Models\User $user = null, ?string $dm = null, ?string $locality = null): array
    {
        $keywords = preg_split('/\s+/', $normalizedQuery);
        $keywords = array_values(array_filter($keywords));

        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where(function ($q) use ($keywords, $rawQuery) {
                foreach ($keywords as $keyword) {
                    $q->where(function ($kw) use ($keyword, $rawQuery) {
                        $like = '%' . $keyword . '%';
                        $kw->where(DB::raw('LOWER(name)'), 'like', $like)
                            ->orWhere(DB::raw('LOWER(dm)'), 'like', $like)
                            ->orWhere(DB::raw('LOWER(locality)'), 'like', $like)
                            ->orWhere(DB::raw('LOWER(no_ahli)'), 'like', $like)
                            ->orWhere('no_kp', 'like', $like)
                            ->orWhere('old_ic', 'like', $like)
                            ->orWhere('phone_home', 'like', $like)
                            ->orWhere('phone_mobile', 'like', $like);
                    });
                }
            });

        $user?->applyScopeToPemilihQuery($query);

        if ($dm) {
            $query->orderByRaw('CASE WHEN dm = ? THEN 0 ELSE 1 END', [$dm]);
        }
        if ($locality) {
            $query->orderByRaw('CASE WHEN locality = ? THEN 0 ELSE 1 END', [$locality]);
        }

        $records = $query
            ->limit($limit)
            ->get()
            ->map(function (PemilihRecord $record) {
                $id = sha1(json_encode([
                    $record->name === '-' ? '' : ($record->name ?? ''),
                    $record->no_kp ?? '',
                    $record->old_ic ?? '',
                    $record->phone_home ?? '',
                    $record->phone_mobile ?? '',
                    $record->dm === '-' ? '' : ($record->dm ?? ''),
                    $record->locality === '-' ? '' : ($record->locality ?? ''),
                ], JSON_UNESCAPED_UNICODE));

                return [
                    'id' => $id,
                    'record_id' => $record->id,
                    'voter_id' => $id,
                    'avatar_url' => $record->avatarUrl(),
                    'name' => $record->name,
                    'no_kp' => $record->no_kp,
                    'old_ic' => $record->old_ic,
                    'no_ahli' => $record->no_ahli,
                    'age' => $this->calculateAge($record->no_kp),
                    'phone_mobile' => $record->phone_mobile,
                    'phone_home' => $record->phone_home,
                    'dm' => $record->dm,
                    'locality' => $record->locality,
                    'gender' => $record->gender,
                    'race' => $record->race,
                    'cula_code' => $record->cula_code,
                    'cula_display_label' => $record->cula_display_label,
                    'address' => $record->address,
                    'is_manual' => $record->is_manual,
                ];
            })
            ->all();

        return $records;
    }

    public function syncUploadedVoters(string $path): void
    {
        CulaWorkItem::query()->delete();
        $rows = $this->readRows($path);
        $voters = $this->normalizeUploadedVoters($rows, basename($path));
        $identityNumbers = array_values(array_filter(array_column($voters, 'identity_number')));

        foreach ($voters as $voter) {
            $existing = PemilihRecord::query()->where('identity_number', $voter['identity_number'])->first();

            if ($existing && $existing->cula_code && $existing->cula_code !== '?' && ($voter['cula_code'] ?? '') === '?') {
                unset($voter['cula_code'], $voter['cula_display_label']);
                $voter['cula_remark'] = 'Data import ' . ($voter['source_file'] ?? 'fail') . ' pada ' . now()->format('d-m-Y') . ' - tiada kod cula';
            }

            $record = PemilihRecord::query()->updateOrCreate(
                ['identity_number' => $voter['identity_number']],
                $voter,
            );

            if ($record->no_kp || $record->old_ic) {
                \App\Models\ProgramAttendee::query()
                    ->where(function ($q) use ($record) {
                        $q->where('no_kp', $record->no_kp);
                        if ($record->old_ic) {
                            $q->orWhere('old_ic', $record->old_ic);
                        }
                    })
                    ->update([
                        'cula_code' => $record->cula_code,
                        'cula_display_label' => $record->cula_display_label,
                    ]);
            }
        }

        if ($identityNumbers === []) {
            PemilihRecord::query()->update(['status' => 'xaktif']);

            return;
        }

        PemilihRecord::query()
            ->whereNotIn('identity_number', $identityNumbers)
            ->update(['status' => 'xaktif']);
    }

    public function getMetadata(): array
    {
        $path = Setting::valueOf('pemilih_report_file_path', self::DEFAULT_SAMPLE_PATH);
        $uploadedAt = Setting::valueOf('pemilih_report_uploaded_at');

        if ($uploadedAt) {
            try {
                $uploadedAt = \Carbon\Carbon::parse($uploadedAt, 'Asia/Kuala_Lumpur')->format('d-m-Y h:i A');
            } catch (\Exception $e) {
            }
        }

        return [
            'name' => is_string($path) ? basename($path) : null,
            'exists' => is_string($path) && file_exists($path),
            'uploaded_by' => Setting::valueOf('pemilih_report_uploaded_by'),
            'uploaded_at' => $uploadedAt,
        ];
    }

    private function searchIndexForPath(?string $path = null): array
    {
        $resolvedPath = $path ?: self::DEFAULT_SAMPLE_PATH;

        if (! is_string($resolvedPath) || ! file_exists($resolvedPath)) {
            return [];
        }

        $cachedSearchIndex = $this->readCachedSearchIndex($resolvedPath);

        if ($cachedSearchIndex !== null) {
            return $this->normalizeSearchIndexRows($cachedSearchIndex);
        }

        $legacySnapshot = $this->readLegacySnapshot($resolvedPath);
        $legacySearchIndex = $this->extractSearchIndexFromLegacySnapshot($legacySnapshot);

        if ($legacySearchIndex !== null) {
            $normalizedLegacySearchIndex = $this->normalizeSearchIndexRows($legacySearchIndex);
            $this->writeCachedSearchIndex($resolvedPath, $normalizedLegacySearchIndex);

            return $normalizedLegacySearchIndex;
        }

        $rows = $this->readRows($resolvedPath);
        $searchIndex = $this->buildSearchIndex($rows);
        $this->writeCachedSearchIndex($resolvedPath, $searchIndex);

        return $searchIndex;
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

        $dom = new \DOMDocument;
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
            $culaCode = $this->normalizeCulaCode($row['Kod Cula'] ?? '');
            $culaDetail = $this->culaDetail($culaCode);

            $genderKey = in_array($genderCode, ['L', 'P'], true) ? $genderCode : 'LAIN';
            $gender[$genderKey]++;

            $dmKey = $dmCode.'|'.$dmName;
            $dm[$dmKey] ??= [
                'key' => $dmKey,
                'code' => $dmCode,
                'name' => $dmName,
                'total' => 0,
                'male' => 0,
                'female' => 0,
                'other_gender' => 0,
                'with_cula' => 0,
                'belum_dicula' => 0,
                'coverage_percent' => 0,
            ];
            $this->incrementGroup($dm[$dmKey], $genderKey, $culaDetail['is_completed']);

            $dmCula[$dmKey] ??= [
                'key' => $dmKey,
                'code' => $dmCode,
                'name' => $dmName,
                'total' => 0,
                'cula_breakdown' => [],
            ];
            $dmCula[$dmKey]['total']++;
            $dmCula[$dmKey]['cula_breakdown'][$culaCode] ??= [
                ...$culaDetail,
                'total' => 0,
            ];
            $dmCula[$dmKey]['cula_breakdown'][$culaCode]['total']++;

            $dmDetails[$dmKey] ??= [
                'key' => $dmKey,
                'code' => $dmCode,
                'name' => $dmName,
                'summary' => [
                    'total_voters' => 0,
                    'male' => 0,
                    'female' => 0,
                    'other_gender' => 0,
                    'with_cula' => 0,
                    'belum_dicula' => 0,
                    'coverage_percent' => 0,
                    'total_localities' => 0,
                ],
                'race_breakdown' => [],
                'localities' => [],
            ];
            $this->incrementSummary($dmDetails[$dmKey]['summary'], $genderKey, $culaDetail['is_completed']);

            $localityKey = $localityCode.'|'.$localityName.'|'.$dmKey;
            $localities[$localityKey] ??= [
                'key' => $localityKey,
                'code' => $localityCode,
                'name' => $localityName,
                'dm' => $dmName,
                'dm_key' => $dmKey,
                'total' => 0,
                'male' => 0,
                'female' => 0,
                'other_gender' => 0,
                'with_cula' => 0,
                'belum_dicula' => 0,
                'coverage_percent' => 0,
                'cula_breakdown' => [],
            ];
            $this->incrementGroup($localities[$localityKey], $genderKey, $culaDetail['is_completed']);
            $localities[$localityKey]['cula_breakdown'][$culaCode] ??= [
                ...$culaDetail,
                'total' => 0,
            ];
            $localities[$localityKey]['cula_breakdown'][$culaCode]['total']++;

            $dmDetails[$dmKey]['race_breakdown'][$raceCode] ??= [
                'code' => $raceCode,
                'label' => $raceCode,
                'total' => 0,
            ];
            $dmDetails[$dmKey]['race_breakdown'][$raceCode]['total']++;

            $dmDetails[$dmKey]['localities'][$localityKey] ??= [
                'key' => $localityKey,
                'code' => $localityCode,
                'name' => $localityName,
                'total' => 0,
                'male' => 0,
                'female' => 0,
                'other_gender' => 0,
                'with_cula' => 0,
                'belum_dicula' => 0,
                'coverage_percent' => 0,
                'race_breakdown' => [],
                'cula_breakdown' => [],
            ];
            $this->incrementGroup($dmDetails[$dmKey]['localities'][$localityKey], $genderKey, $culaDetail['is_completed']);
            $dmDetails[$dmKey]['localities'][$localityKey]['race_breakdown'][$raceCode] ??= [
                'code' => $raceCode,
                'label' => $raceCode,
                'total' => 0,
            ];
            $dmDetails[$dmKey]['localities'][$localityKey]['race_breakdown'][$raceCode]['total']++;
            $dmDetails[$dmKey]['localities'][$localityKey]['cula_breakdown'][$culaCode] ??= [
                ...$culaDetail,
                'total' => 0,
            ];
            $dmDetails[$dmKey]['localities'][$localityKey]['cula_breakdown'][$culaCode]['total']++;

            $cula[$culaCode] ??= [
                ...$culaDetail,
                'total' => 0,
            ];
            $cula[$culaCode]['total']++;
        }

        $summary = [
            'total_voters' => count($rows),
            'total_dm' => count($dm),
            'total_localities' => count($localities),
            'male' => $gender['L'],
            'female' => $gender['P'],
            'other_gender' => $gender['LAIN'],
            'with_cula' => array_sum(array_map(fn (array $row) => $row['with_cula'], $dm)),
            'belum_dicula' => array_sum(array_map(fn (array $row) => $row['belum_dicula'], $dm)),
        ];
        $summary['coverage_percent'] = $this->coveragePercent($summary['with_cula'], $summary['total_voters']);

        $dmRows = $this->sortUdmGroups($dm);
        $dmCulaRows = $this->sortDmCulaGroups($dmCula);
        $dmDetailRows = $this->sortDmDetailGroups($dmDetails);
        $localityRows = $this->sortGroups($localities, 'name');
        $culaRows = $this->sortGroups($cula, 'code');

        return [
            '_schema_version' => self::REPORT_SCHEMA_VERSION,
            'source' => [
                'name' => basename($path),
                'exists' => true,
            ],
            'summary' => $summary,
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

    private function incrementGroup(array &$group, string $genderKey, bool $hasCula): void
    {
        $group['total']++;

        match ($genderKey) {
            'L' => $group['male']++,
            'P' => $group['female']++,
            default => $group['other_gender']++,
        };

        if ($hasCula) {
            $group['with_cula']++;
        } elseif (array_key_exists('belum_dicula', $group)) {
            $group['belum_dicula']++;
        }
    }

    private function incrementSummary(array &$summary, string $genderKey, bool $hasCula): void
    {
        $summary['total_voters']++;

        match ($genderKey) {
            'L' => $summary['male']++,
            'P' => $summary['female']++,
            default => $summary['other_gender']++,
        };

        if ($hasCula) {
            $summary['with_cula']++;
        } else {
            $summary['belum_dicula']++;
        }
    }

    private function sortGroups(array $groups, string $secondaryKey): array
    {
        $rows = array_map(fn (array $row) => $this->finalizeMetrics($row), array_values($groups));

        foreach ($rows as &$row) {
            if (array_key_exists('cula_breakdown', $row) && is_array($row['cula_breakdown'])) {
                $row['cula_breakdown'] = $this->sortGroups($row['cula_breakdown'], 'code');
            }
        }

        unset($row);

        usort($rows, function (array $first, array $second) use ($secondaryKey) {
            return $second['total'] <=> $first['total']
                ?: strnatcasecmp((string) $first[$secondaryKey], (string) $second[$secondaryKey]);
        });

        return $rows;
    }

    private function sortDmCulaGroups(array $groups): array
    {
        $rows = array_map(fn (array $row) => $this->finalizeMetrics($row), array_values($groups));

        foreach ($rows as &$row) {
            $row['cula_breakdown'] = $this->sortGroups($row['cula_breakdown'], 'code');
        }

        unset($row);

        usort($rows, fn (array $first, array $second) => $this->compareByCodeThenName($first, $second));

        return $rows;
    }

    private function sortDmDetailGroups(array $groups): array
    {
        $rows = array_values($groups);

        foreach ($rows as &$row) {
            $row['race_breakdown'] = $this->sortGroups($row['race_breakdown'], 'code');
            $row['localities'] = $this->sortLocalityDetailGroups($row['localities']);
            $row['summary']['total_localities'] = count($row['localities']);
            $row['summary']['coverage_percent'] = $this->coveragePercent(
                $row['summary']['with_cula'],
                $row['summary']['total_voters'],
            );
        }

        unset($row);

        usort($rows, fn (array $first, array $second) => $this->compareByCodeThenName($first, $second));

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

    private function nullableLabel(string $value): ?string
    {
        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private function emptyReport(?string $path): array
    {
        return [
            '_schema_version' => self::REPORT_SCHEMA_VERSION,
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
                'belum_dicula' => 0,
                'coverage_percent' => 0,
            ],
            'gender' => [],
            'by_dm' => [],
            'cula_by_dm' => [],
            'dm_details' => [],
            'by_locality' => [],
            'by_cula' => [],
        ];
    }

    private function buildSearchIndex(array $rows): array
    {
        return $this->normalizeSearchIndexRows(array_values(array_filter(array_map(function (array $row) {
            $name = $this->fallbackLabel($row['Nama Pemilih'] ?? '', '');
            $noKp = $this->cleanDigits($row['No. K/P (Baru)'] ?? '');
            $oldIc = $this->cleanDigits($row['No. K/P (Lama)'] ?? '');
            $phoneHome = $this->cleanDigits($row['Tel. Rumah'] ?? '');
            $phoneMobile = $this->cleanDigits($row['Tel. Bimbit'] ?? '');

            if ($name === '' && $noKp === '' && $phoneHome === '' && $phoneMobile === '') {
                return null;
            }

            $address = $this->fallbackLabel($row['Alamat Kediaman'] ?? ($row['Alamat K/P'] ?? ''), '-');

            return [
                'id' => sha1(json_encode([
                    $name,
                    $noKp,
                    $oldIc,
                    $phoneHome,
                    $phoneMobile,
                    $row['Nama DM'] ?? '',
                    $row['Nama Lokaliti'] ?? '',
                ], JSON_UNESCAPED_UNICODE)),
                'name' => $name === '' ? '-' : $name,
                'no_kp' => $noKp,
                'old_ic' => $oldIc,
                'phone_mobile' => $phoneMobile,
                'phone_home' => $phoneHome,
                'dm' => $this->fallbackLabel($row['Nama DM'] ?? '', '-'),
                'locality' => $this->fallbackLabel($row['Nama Lokaliti'] ?? '', '-'),
                'gender' => $this->fallbackLabel($row['Jantina'] ?? '', '-'),
                'race' => $this->fallbackLabel($row['Bangsa'] ?? '', '-'),
                'cula_code' => $this->normalizeCulaCode($row['Kod Cula'] ?? ''),
                'cula_display_label' => $this->displayCulaLabel($this->normalizeCulaCode($row['Kod Cula'] ?? '')),
                'address' => $address,
                'search_blob' => $this->normalizeSearch(implode(' ', [
                    $name,
                    $noKp,
                    $oldIc,
                    $phoneHome,
                    $phoneMobile,
                    $row['Nama DM'] ?? '',
                    $row['Nama Lokaliti'] ?? '',
                ])),
            ];
        }, $rows))));
    }

    private function normalizeUploadedVoters(array $rows, string $sourceFile): array
    {
        $normalized = [];

        foreach ($rows as $row) {
            $name = $this->fallbackLabel($row['Nama Pemilih'] ?? '', '');
            $noKp = $this->cleanDigits($row['No. K/P (Baru)'] ?? '');
            $oldIc = $this->cleanDigits($row['No. K/P (Lama)'] ?? '');
            $identityNumber = $noKp !== '' ? $noKp : $oldIc;

            if ($identityNumber === '') {
                continue;
            }

            $culaCode = $this->normalizeCulaCode($row['Kod Cula'] ?? '');
            $normalized[$identityNumber] = [
                'identity_number' => $identityNumber,
                'no_kp' => $noKp !== '' ? $noKp : null,
                'old_ic' => $oldIc !== '' ? $oldIc : null,
                'name' => $name !== '' ? $name : null,
                'dm' => $this->nullableLabel($row['Nama DM'] ?? ''),
                'locality' => $this->nullableLabel($row['Nama Lokaliti'] ?? ''),
                'gender' => $this->nullableLabel($row['Jantina'] ?? ''),
                'race' => $this->nullableLabel($row['Bangsa'] ?? ''),
                'cula_code' => $culaCode,
                'cula_display_label' => $this->displayCulaLabel($culaCode),
                'address' => $this->nullableLabel($row['Alamat Kediaman'] ?? ($row['Alamat K/P'] ?? '')),
                'phone_home' => $this->nullableLabel($this->cleanDigits($row['Tel. Rumah'] ?? '')),
                'phone_mobile' => $this->nullableLabel($this->cleanDigits($row['Tel. Bimbit'] ?? '')),
                'status' => 'aktif',
                'source_file' => $sourceFile,
                'is_manual' => false,
            ];
        }

        return array_values($normalized);
    }

    private function readCachedReport(string $path): ?array
    {
        $decoded = $this->readJsonCache($this->reportCachePath($path));

        if (
            ! is_array($decoded)
            || ! array_key_exists('summary', $decoded)
            || ($decoded['_schema_version'] ?? null) !== self::REPORT_SCHEMA_VERSION
        ) {
            return null;
        }

        return $decoded;
    }

    private function readCachedSearchIndex(string $path): ?array
    {
        $decoded = $this->readJsonCache($this->searchCachePath($path));

        if (! is_array($decoded)) {
            return null;
        }

        foreach ($decoded as $row) {
            if (! is_array($row) || ! array_key_exists('search_blob', $row) || ! array_key_exists('cula_display_label', $row)) {
                return null;
            }
        }

        return $decoded;
    }

    private function readLegacySnapshot(string $path): ?array
    {
        return $this->readJsonCache($this->legacyCachePath($path));
    }

    private function readJsonCache(string $cachePath): ?array
    {
        if (! File::exists($cachePath)) {
            return null;
        }

        $contents = File::get($cachePath);
        $decoded = json_decode($contents, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function extractReportFromLegacySnapshot(?array $snapshot): ?array
    {
        if (! is_array($snapshot)) {
            return null;
        }

        if (
            array_key_exists('report', $snapshot)
            && is_array($snapshot['report'])
            && array_key_exists('summary', $snapshot['report'])
            && ($snapshot['report']['_schema_version'] ?? null) === self::REPORT_SCHEMA_VERSION
        ) {
            return $snapshot['report'];
        }

        return null;
    }

    private function extractSearchIndexFromLegacySnapshot(?array $snapshot): ?array
    {
        if (! is_array($snapshot) || ! array_key_exists('search_index', $snapshot) || ! is_array($snapshot['search_index'])) {
            return null;
        }

        return $snapshot['search_index'];
    }

    private function writeCachedReport(string $path, array $report): void
    {
        $cachePath = $this->reportCachePath($path);
        File::ensureDirectoryExists(dirname($cachePath));
        File::put($cachePath, json_encode($report, JSON_UNESCAPED_UNICODE));
    }

    private function writeCachedSearchIndex(string $path, array $searchIndex): void
    {
        $cachePath = $this->searchCachePath($path);
        File::ensureDirectoryExists(dirname($cachePath));
        File::put($cachePath, json_encode($searchIndex, JSON_UNESCAPED_UNICODE));
    }

    private function reportCachePath(string $path): string
    {
        return storage_path('app/report-cache/'.$this->cacheSignature($path).'-report.json');
    }

    private function searchCachePath(string $path): string
    {
        return storage_path('app/report-cache/'.$this->cacheSignature($path).'-search.json');
    }

    private function legacyCachePath(string $path): string
    {
        return storage_path('app/report-cache/'.$this->cacheSignature($path).'.json');
    }

    private function cacheSignature(string $path): string
    {
        return sha1(implode('|', [
            $path,
            (string) filemtime($path),
            (string) filesize($path),
        ]));
    }

    private function cleanDigits(string $value): string
    {
        return preg_replace('/\D+/', '', $value) ?? '';
    }

    private function normalizeSearch(string $value): string
    {
        $value = mb_strtolower(trim($value));

        return preg_replace('/\s+/', ' ', $value) ?? $value;
    }

    private function normalizeCulaCode(string $value): string
    {
        $normalized = strtoupper(trim($value));

        return $normalized === '' || $normalized === '?' || $normalized === 'TIADA' ? '?' : $normalized;
    }

    private function culaDetail(string $code): array
    {
        $displayLabel = $this->displayCulaLabel($code);

        return [
            'code' => $code,
            'label' => $displayLabel,
            'display_label' => $displayLabel,
            'is_completed' => $code !== '?',
        ];
    }

    private function culaLabel(string $code): string
    {
        return self::CULA_LABELS[$code] ?? $code;
    }

    private function displayCulaLabel(string $code): string
    {
        $label = $this->culaLabel($code);

        return $label === $code ? $code : $code.' - '.$label;
    }

    private function sortUdmGroups(array $groups): array
    {
        $rows = array_map(fn (array $row) => $this->finalizeMetrics($row), array_values($groups));

        usort($rows, fn (array $first, array $second) => $this->compareByCodeThenName($first, $second));

        return $rows;
    }

    private function compareByCodeThenName(array $first, array $second): int
    {
        return strnatcasecmp((string) ($first['code'] ?? ''), (string) ($second['code'] ?? ''))
            ?: strnatcasecmp((string) ($first['name'] ?? ''), (string) ($second['name'] ?? ''));
    }

    private function finalizeMetrics(array $row, string $totalKey = 'total'): array
    {
        if (array_key_exists('with_cula', $row) && array_key_exists($totalKey, $row)) {
            $row['coverage_percent'] = $this->coveragePercent($row['with_cula'], (int) $row[$totalKey]);
        }

        return $row;
    }

    private function coveragePercent(int $withCula, int $total): float
    {
        if ($total === 0) {
            return 0.0;
        }

        return round(($withCula / $total) * 100, 1);
    }

    private function normalizeSearchIndexRows(array $rows): array
    {
        return array_values(array_map(function (array $row) {
            $culaCode = $this->normalizeCulaCode((string) ($row['cula_code'] ?? '?'));

            $row['cula_code'] = $culaCode;
            $row['cula_display_label'] = $this->displayCulaLabel($culaCode);

            return $row;
        }, $rows));
    }

    private function calculateAge(?string $noKp): ?int
    {
        if (! $noKp || strlen($noKp) < 2 || ! preg_match('/^(\d{2})/', $noKp, $m)) {
            return null;
        }

        $yy = (int) $m[1];
        $currentYear = (int) now()->format('y');
        $century = $yy > $currentYear ? 1900 : 2000;

        $age = (int) now()->year - ($century + $yy);

        return $age < 18 ? null : $age;
    }
}
