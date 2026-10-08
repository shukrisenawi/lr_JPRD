<?php

namespace App\Services;

use App\Models\PemilihBaruRecord;
use App\Models\PemilihRecord;
use App\Support\CulaCodes;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PemilihBaruService
{
    public function defaultMonth(): string
    {
        return now()->startOfMonth()->subMonthNoOverflow()->format('Y-m');
    }

    public function monthOptions(): array
    {
        return array_map(fn (int $month) => [
            'value' => str_pad((string) $month, 2, '0', STR_PAD_LEFT),
            'label' => Carbon::create(now()->year, $month, 1)->locale('ms')->isoFormat('MMMM'),
        ], range(1, 12));
    }

    public function yearOptions(): array
    {
        $years = range(now()->year - 5, now()->year + 1);
        $years[] = (int) substr($this->defaultMonth(), 0, 4);

        $existingYears = PemilihBaruRecord::query()
            ->selectRaw('DISTINCT SUBSTR(import_month, 1, 4) as import_year')
            ->pluck('import_year')
            ->map(fn ($year) => (int) $year)
            ->all();

        $years = array_values(array_unique([...$years, ...$existingYears]));
        rsort($years, SORT_NUMERIC);

        return array_map(fn (int $year) => [
            'value' => (string) $year,
            'label' => (string) $year,
        ], $years);
    }

    public function metadata(): array
    {
        $latest = PemilihBaruRecord::query()->latest('id')->first();
        $imports = PemilihBaruRecord::query()
            ->whereNotNull('source_file')
            ->where('source_file', '!=', '')
            ->select('source_file', 'import_month')
            ->selectRaw('COUNT(*) as record_count')
            ->selectRaw('MAX(imported_by) as imported_by')
            ->selectRaw('MAX(updated_at) as imported_at')
            ->selectRaw("SUM(CASE WHEN remark = 'Dah link' THEN 1 ELSE 0 END) as linked_count")
            ->groupBy('source_file', 'import_month')
            ->orderByDesc('import_month')
            ->orderByDesc('imported_at')
            ->get()
            ->map(fn ($import) => [
                'source_file' => $import->source_file,
                'import_month' => $import->import_month,
                'record_count' => (int) $import->record_count,
                'linked_count' => (int) $import->linked_count,
                'imported_by' => $import->imported_by,
                'imported_at' => $import->imported_at
                    ? Carbon::parse($import->imported_at)->locale('ms')->isoFormat('DD-MM-YYYY h:mm A')
                    : null,
            ])
            ->values();

        return [
            'total' => PemilihBaruRecord::query()->count(),
            'last_import_month' => $latest?->import_month,
            'last_import_file' => $latest?->source_file,
            'last_imported_by' => $latest?->imported_by,
            'last_imported_at' => $latest?->created_at?->locale('ms')->isoFormat('DD-MM-YYYY h:mm A'),
            'default_month' => $this->defaultMonth(),
            'month_options' => $this->monthOptions(),
            'year_options' => $this->yearOptions(),
            'imports' => $imports,
        ];
    }

    public function deleteImport(string $filename, string $month): int
    {
        return DB::transaction(fn () => PemilihBaruRecord::query()
            ->where('source_file', $filename)
            ->where('import_month', $month)
            ->delete());
    }

    public function monthlyMovementReport(?int $year = null): array
    {
        $year ??= (int) now()->year;
        $records = PemilihBaruRecord::query()
            ->where('import_month', 'like', $year.'-%')
            ->get(['import_month', 'transaction', 'no_kp', 'birth_year', 'cula_code', 'race']);
        $latestImportedMonth = (int) $records
            ->map(fn (PemilihBaruRecord $record) => (int) substr($record->import_month, 5, 2))
            ->max();
        $lastClosedMonth = $year === (int) now()->year ? max(1, (int) now()->format('n') - 1) : 1;
        $lastMonth = min(12, max($lastClosedMonth, $latestImportedMonth));
        $recordsByMonth = $records->groupBy('import_month');
        $rows = [];

        for ($month = 1; $month <= $lastMonth; $month++) {
            $monthKey = sprintf('%04d-%02d', $year, $month);
            $monthRecords = $recordsByMonth->get($monthKey, collect());
            $row = [
                'key' => $monthKey,
                'month' => Carbon::create($year, $month, 1)->locale('ms')->isoFormat('MMM-YY'),
                'jumlah_pemilih' => $monthRecords->count(),
                'pengundi_baru_total' => 0,
                'pengundi_baru_dikenali_melayu' => 0,
                'pengundi_baru_dikenali_bukan_melayu' => 0,
                'pengundi_baru_tidak_dikenali_melayu' => 0,
                'pengundi_baru_tidak_dikenali_bukan_melayu' => 0,
                'pengundi_baru_cula_b' => '',
                'pindah_masuk_total' => 0,
                'pindah_masuk_dikenali_melayu' => 0,
                'pindah_masuk_dikenali_bukan_melayu' => 0,
                'pindah_masuk_tidak_dikenali_melayu' => 0,
                'pindah_masuk_tidak_dikenali_bukan_melayu' => 0,
                'pindah_masuk_cula_b' => '',
                'pindah_keluar_total' => 0,
                'pindah_keluar_dikenali_melayu' => 0,
                'pindah_keluar_dikenali_bukan_melayu' => 0,
                'pindah_keluar_tidak_dikenali_melayu' => 0,
                'pindah_keluar_tidak_dikenali_bukan_melayu' => 0,
                'pindah_keluar_cula_b' => '',
            ];

            foreach ($monthRecords as $record) {
                $transaction = mb_strtoupper(trim((string) $record->transaction));
                $category = null;

                if (str_contains($transaction, 'PENDAFTARAN BARU')) {
                    if (($this->voterAge($record) ?? 0) >= 18) {
                        $category = 'pengundi_baru';
                    }
                } elseif (
                    str_contains($transaction, 'PERTUKARAN BAHAGIAN PILIHAN RAYA')
                    || str_contains($transaction, 'PINDAH MASUK')
                ) {
                    $category = 'pindah_masuk';
                } elseif (str_contains($transaction, 'KELUAR')) {
                    $category = 'pindah_keluar';
                }

                if ($category === null) {
                    continue;
                }

                $row[$category.'_total']++;
                $recognition = $this->reportRecognition($record->cula_code);
                $race = $this->reportRaceGroup($record->race);

                if ($recognition !== null && $race !== null) {
                    $row[$category.'_'.$recognition.'_'.$race]++;
                }
            }

            $rows[] = $row;
        }

        return [
            'year' => $year,
            'rows' => $rows,
        ];
    }

    public function importFile(string $path, string $filename, string $month, string $importedBy): array
    {
        $rows = $this->readRows($path, $filename);

        if ($rows === []) {
            throw new RuntimeException('Fail tidak mempunyai rekod untuk diimport.');
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;

        DB::transaction(function () use ($rows, $filename, $month, $importedBy, &$created, &$updated, &$skipped): void {
            foreach ($rows as $row) {
                if (! $this->isDaerahMengundi24($this->value($row, ['Kod DUN', 'Kod D.U.N.', 'Kod DUN (24)', 'Kod Daerah Mengundi', 'DUN']))) {
                    $skipped++;

                    continue;
                }

                $data = $this->normalizeRow($row, $month, $filename, $importedBy);

                if ($data === null) {
                    continue;
                }

                $record = PemilihBaruRecord::query()
                    ->where('record_key', $data['record_key'])
                    ->first();

                if ($record) {
                    if (filled($record->cula_code)) {
                        $data['cula_code'] = $record->cula_code;
                        $data['cula_display_label'] = $record->cula_display_label;
                    }
                    $record->fill($data)->save();
                    $updated++;

                    continue;
                }

                PemilihBaruRecord::query()->create($data + [
                    'remark' => 'Belum link',
                ]);
                $created++;
            }
        });

        if ($created + $updated === 0) {
            throw new RuntimeException('Tiada rekod dengan Kod DUN 24 untuk diimport.');
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'month' => $month,
        ];
    }

    public function linkCurrentVoters(): array
    {
        $linkedCount = 0;
        $culaAppliedCount = 0;

        PemilihBaruRecord::query()
            ->orderBy('import_month')
            ->orderBy('id')
            ->chunk(250, function ($records) use (&$linkedCount, &$culaAppliedCount): void {
                foreach ($records as $record) {
                    $pemilih = $this->findCurrentVoter($record);

                    if (! $pemilih) {
                        continue;
                    }

                    $record->forceFill([
                        'linked_pemilih_record_id' => $pemilih->id,
                        'linked_at' => $record->linked_at ?? now(),
                        'remark' => 'Dah link',
                    ])->save();
                    $linkedCount++;

                    if (! $this->hasCula($record->cula_code)) {
                        continue;
                    }

                    $pemilih->forceFill([
                        'cula_code' => $record->cula_code,
                        'cula_display_label' => $record->cula_display_label ?: CulaCodes::label($record->cula_code),
                        'cula_remark' => null,
                    ])->save();
                    $culaAppliedCount++;
                }
            });

        return [
            'linked_count' => $linkedCount,
            'cula_applied_count' => $culaAppliedCount,
        ];
    }

    public function updateCula(PemilihBaruRecord $record, string $code, string $race): void
    {
        $label = CulaCodes::label($code);

        DB::transaction(function () use ($record, $code, $label, $race): void {
            $record->forceFill([
                'cula_code' => $code,
                'cula_display_label' => $label,
                'race' => $race,
            ])->save();

            $pemilih = PemilihRecord::query()
                ->whereKey($record->linked_pemilih_record_id)
                ->where('status', 'aktif')
                ->where('is_manual', false)
                ->first();

            if ($pemilih) {
                $pemilih->forceFill([
                    'cula_code' => $code,
                    'cula_display_label' => $label,
                    'cula_remark' => null,
                ])->save();
            }
        });
    }

    private function findCurrentVoter(PemilihBaruRecord $record): ?PemilihRecord
    {
        foreach ([
            [$record->no_kp, 'no_kp'],
            [$record->id_lain, 'old_ic'],
        ] as [$identity, $field]) {
            $digits = $this->digits((string) $identity);

            if (str_contains((string) $identity, '*') || strlen($digits) < 8) {
                continue;
            }

            $match = $this->currentVoters()
                ->where(function (Builder $query) use ($digits, $field): void {
                    $query->where('identity_number', $digits)
                        ->orWhere($field, $digits);
                })
                ->limit(2)
                ->get();

            if ($match->count() === 1) {
                return $match->first();
            }
        }

        if (! $record->name || ! $record->dm || ! $record->locality || ! $record->gender) {
            return null;
        }

        foreach ([
            [$record->no_kp, 'no_kp'],
            [$record->id_lain, 'old_ic'],
        ] as [$identity, $field]) {
            $prefix = $this->maskedIdentity($identity);

            if ($prefix === null) {
                continue;
            }

            $matches = $this->currentVoters()
                ->whereRaw('UPPER(TRIM(name)) = ?', [mb_strtoupper(trim($record->name))])
                ->whereRaw('UPPER(TRIM(dm)) = ?', [mb_strtoupper(trim($record->dm))])
                ->whereRaw('UPPER(TRIM(locality)) = ?', [mb_strtoupper(trim($record->locality))])
                ->whereRaw('UPPER(TRIM(gender)) = ?', [mb_strtoupper(trim($record->gender))])
                ->where($field, 'like', $prefix.'%')
                ->limit(2)
                ->get();

            if ($matches->count() === 1) {
                return $matches->first();
            }
        }

        return null;
    }

    private function currentVoters(): Builder
    {
        return PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false);
    }

    private function maskedIdentity(?string $identity): ?string
    {
        $identity = strtoupper(preg_replace('/[\s-]+/', '', trim((string) $identity)) ?? '');

        if (preg_match('/^(\d{8,})\*+$/', $identity, $matches) !== 1) {
            return null;
        }

        return $matches[1];
    }

    private function normalizeRow(array $row, string $month, string $filename, string $importedBy): ?array
    {
        $noKp = $this->normalizeIdentity($this->value($row, ['No KP', 'No. KP', 'No K/P', 'No. K/P (Baru)', 'No K/P (Baru)']));
        $idLain = $this->normalizeIdentity($this->value($row, ['ID Lain', 'No ID', 'ID']));
        $name = $this->nullable($this->value($row, ['Nama', 'Nama Pemilih']));
        $dm = $this->nullable($this->value($row, ['Nama DM', 'DM']));
        $locality = $this->nullable($this->value($row, ['Nama Lokaliti', 'Lokaliti']));
        $transaction = $this->nullable($this->value($row, ['Transaksi', 'Jenis Transaksi']));

        if (! $noKp && ! $idLain && ! $name) {
            return null;
        }

        $culaCode = strtoupper($this->value($row, ['Kod Cula']));
        $culaCode = $culaCode === '' || $culaCode === '?' || $culaCode === 'TIADA' ? null : $culaCode;
        $birthYearValue = $this->digits($this->value($row, ['Tahun Lahir', 'Tahun Kelahiran']));
        $birthYear = strlen($birthYearValue) === 4 && (int) $birthYearValue >= 1800 && (int) $birthYearValue <= 2200
            ? (int) $birthYearValue
            : null;

        $recordKey = sha1(implode('|', [
            $month,
            $noKp,
            $idLain,
            mb_strtoupper((string) $name),
            mb_strtoupper((string) $dm),
            mb_strtoupper((string) $locality),
            mb_strtoupper((string) $transaction),
        ]));

        return [
            'record_key' => $recordKey,
            'import_month' => $month,
            'kod_par' => $this->nullable($this->value($row, ['Kod Par'])),
            'nama_par' => $this->nullable($this->value($row, ['Nama Par'])),
            'kod_dun' => $this->nullable($this->value($row, ['Kod DUN', 'Kod D.U.N.', 'Kod DUN (24)', 'Kod Daerah Mengundi', 'DUN'])),
            'nama_dun' => $this->nullable($this->value($row, ['Nama DUN'])),
            'kod_dm' => $this->nullable($this->value($row, ['Kod DM'])),
            'dm' => $dm,
            'kod_lokaliti' => $this->nullable($this->value($row, ['Kod Lok', 'Kod Lokaliti'])),
            'locality' => $locality,
            'transaction' => $transaction,
            'no_kp' => $noKp ?: null,
            'id_lain' => $idLain ?: null,
            'gender' => $this->nullable($this->value($row, ['Jantina'])),
            'race' => $this->nullable($this->value($row, ['Bangsa', 'Race', 'Keturunan'])),
            'birth_year' => $birthYear,
            'name' => $name,
            'no_rumah' => $this->nullable($this->value($row, ['No Rumah', 'No. Rumah'])),
            'cula_code' => $culaCode,
            'cula_display_label' => $culaCode ? CulaCodes::label($culaCode) : null,
            'catatan' => $this->nullable($this->value($row, ['Catatan'])),
            'alamat_kp' => $this->nullable($this->value($row, ['Alamat K/P', 'Alamat KP'])),
            'address' => $this->nullable($this->value($row, ['Alamat Kediaman', 'Alamat'])),
            'phone_home' => $this->nullable($this->value($row, ['Tel. Rumah', 'Telefon Rumah'])),
            'phone_mobile' => $this->nullable($this->value($row, ['Tel. Bimbit', 'Telefon Bimbit'])),
            'source_file' => $filename,
            'imported_by' => $importedBy,
        ];
    }

    private function readRows(string $path, string $originalFilename): array
    {
        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException('Fail pemilih baharu tidak dapat dibaca.');
        }

        if (str_contains(strtolower(substr($contents, 0, 500)), '<table')) {
            return $this->readHtmlRows($contents);
        }

        return $this->readSpreadsheetRows($path, $originalFilename);
    }

    private function readSpreadsheetRows(string $path, string $originalFilename): array
    {
        $previousErrorHandler = null;
        $previousErrorHandler = set_error_handler(function (int $severity, string $message, string $file, int $line) use (&$previousErrorHandler) {
            $normalizedFile = str_replace('\\', '/', $file);
            $isLegacySpreadsheetNotice = str_contains($normalizedFile, '/vendor/nuovo/spreadsheet-reader/')
                && (in_array($severity, [E_DEPRECATED, E_USER_DEPRECATED], true)
                    || ($severity === E_WARNING && str_contains($message, 'continue" targeting switch is equivalent')));

            if ($isLegacySpreadsheetNotice) {
                return true;
            }

            if (is_callable($previousErrorHandler)) {
                return $previousErrorHandler($severity, $message, $file, $line);
            }

            return false;
        });

        try {
            require_once base_path('vendor/nuovo/spreadsheet-reader/SpreadsheetReader.php');

            $reader = new \SpreadsheetReader($path, $originalFilename);
            $headers = [];
            $rows = [];

            foreach ($reader as $sheetRow) {
                $cells = array_map(fn ($cell) => $this->cleanCell($cell), $sheetRow);

                if ($cells === [] || count(array_filter($cells, fn (string $cell) => $cell !== '')) === 0) {
                    continue;
                }

                if ($headers === []) {
                    $candidateHeaders = array_map(fn (string $header) => $this->normalizeHeader($header), $cells);

                    if (! $this->hasRequiredHeaders($candidateHeaders)) {
                        continue;
                    }

                    $headers = $candidateHeaders;

                    continue;
                }

                $rows[] = $this->combineRow($headers, $cells);
            }

            if ($headers === []) {
                throw new RuntimeException('Tajuk lajur Kod DUN, Nama dan No KP/ID Lain tidak dijumpai dalam fail pemilih baharu.');
            }

            return $rows;
        } finally {
            restore_error_handler();
        }
    }

    private function readHtmlRows(string $html): array
    {
        libxml_use_internal_errors(true);
        $dom = new \DOMDocument;
        $dom->loadHTML($html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_COMPACT);
        $headers = [];
        $rows = [];

        foreach ($dom->getElementsByTagName('tr') as $tableRow) {
            $cells = [];

            foreach ($tableRow->childNodes as $cell) {
                if ($cell instanceof \DOMElement && in_array(strtolower($cell->tagName), ['td', 'th'], true)) {
                    $cells[] = $this->cleanCell($cell->textContent);
                }
            }

            if ($cells === []) {
                continue;
            }

            if ($headers === []) {
                $candidateHeaders = array_map(fn (string $header) => $this->normalizeHeader($header), $cells);

                if (! $this->hasRequiredHeaders($candidateHeaders)) {
                    continue;
                }

                $headers = $candidateHeaders;

                continue;
            }

            $rows[] = $this->combineRow($headers, $cells);
        }

        if ($headers === []) {
            throw new RuntimeException('Tajuk lajur Kod DUN, Nama dan No KP/ID Lain tidak dijumpai dalam fail pemilih baharu.');
        }

        return $rows;
    }

    private function combineRow(array $headers, array $cells): array
    {
        $cells = array_slice(array_pad($cells, count($headers), ''), 0, count($headers));

        return array_combine($headers, $cells) ?: [];
    }

    private function hasRequiredHeaders(array $headers): bool
    {
        return $this->hasHeader($headers, ['Kod DUN', 'Kod D.U.N.', 'Kod DUN (24)', 'Kod Daerah Mengundi', 'DUN'])
            && $this->hasHeader($headers, ['Nama', 'Nama Pemilih'])
            && $this->hasHeader($headers, [
                'No KP',
                'No. KP',
                'No K/P',
                'No. K/P (Baru)',
                'No K/P (Baru)',
                'ID Lain',
                'No ID',
                'ID',
            ]);
    }

    private function hasHeader(array $headers, array $candidates): bool
    {
        foreach ($headers as $header) {
            foreach ($candidates as $candidate) {
                if ($this->headersMatch($header, $candidate)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function headersMatch(string $header, string $candidate): bool
    {
        $headerKey = $this->compactHeader($header);
        $candidateKey = $this->compactHeader($candidate);

        if ($headerKey === $candidateKey) {
            return true;
        }

        return $candidateKey === 'koddun' && str_starts_with($headerKey, 'koddun');
    }

    private function compactHeader(string $header): string
    {
        return preg_replace('/[^a-z0-9]+/u', '', mb_strtolower(trim($header))) ?? '';
    }

    private function normalizeHeader(string $header): string
    {
        return mb_strtolower(preg_replace('/\s+/', ' ', trim($header)) ?? trim($header));
    }

    private function value(array $row, array $headers): string
    {
        foreach ($headers as $header) {
            $key = $this->normalizeHeader($header);

            if (array_key_exists($key, $row)) {
                return $this->cleanCell($row[$key]);
            }
        }

        foreach ($headers as $header) {
            foreach ($row as $actualHeader => $value) {
                if ($this->headersMatch((string) $actualHeader, $header)) {
                    return $this->cleanCell($value);
                }
            }
        }

        return '';
    }

    private function cleanCell(mixed $value): string
    {
        if (is_float($value) && floor($value) === $value) {
            $value = (string) (int) $value;
        } elseif (! is_string($value)) {
            $value = (string) $value;
        }

        $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $value = str_replace("\xc2\xa0", ' ', $value);
        $value = trim($value);

        if (preg_match('/^="(.*)"$/s', $value, $matches) === 1) {
            $value = $matches[1];
        }

        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }

    private function normalizeIdentity(string $value): string
    {
        return strtoupper(preg_replace('/[^A-Z0-9*]/i', '', $this->cleanCell($value)) ?? '');
    }

    private function nullable(string $value): ?string
    {
        $value = $this->cleanCell($value);

        return $value === '' || $value === '-' ? null : $value;
    }

    private function digits(string $value): string
    {
        return preg_replace('/\D+/', '', $value) ?? '';
    }

    private function hasCula(?string $code): bool
    {
        return filled($code) && ! in_array(strtoupper((string) $code), ['0', '?', 'TIADA'], true);
    }

    private function isDaerahMengundi24(string $code): bool
    {
        return is_numeric(trim($code)) && (float) trim($code) === 24.0;
    }

    private function voterAge(PemilihBaruRecord $record): ?int
    {
        $digits = $this->digits((string) $record->no_kp);

        if (strlen($digits) >= 6) {
            $yearPart = (int) substr($digits, 0, 2);
            $month = (int) substr($digits, 2, 2);
            $day = (int) substr($digits, 4, 2);

            if (checkdate($month, $day, 2000 + $yearPart)) {
                $now = now();
                $birthYear = $yearPart > (int) $now->format('y') ? 1900 + $yearPart : 2000 + $yearPart;
                $age = $now->year - $birthYear;

                if ((int) $now->format('md') < (int) sprintf('%02d%02d', $month, $day)) {
                    $age--;
                }

                return $age >= 0 ? $age : null;
            }
        }

        return $record->birth_year ? max(0, now()->year - $record->birth_year) : null;
    }

    private function reportRecognition(?string $code): ?string
    {
        $code = strtoupper(trim((string) $code));

        if (in_array($code, ['7', '7P'], true)) {
            return 'tidak_dikenali';
        }

        if (in_array($code, ['', '0', '?', 'TIADA'], true)) {
            return null;
        }

        return 'dikenali';
    }

    private function reportRaceGroup(?string $race): ?string
    {
        $race = mb_strtoupper(trim((string) $race));

        if (in_array($race, ['MELAYU', 'M'], true)) {
            return 'melayu';
        }

        return $race !== '' ? 'bukan_melayu' : null;
    }
}
