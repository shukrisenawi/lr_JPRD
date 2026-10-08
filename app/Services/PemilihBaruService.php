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

        return [
            'total' => PemilihBaruRecord::query()->count(),
            'last_import_month' => $latest?->import_month,
            'last_import_file' => $latest?->source_file,
            'last_imported_by' => $latest?->imported_by,
            'last_imported_at' => $latest?->created_at?->locale('ms')->isoFormat('DD-MM-YYYY h:mm A'),
            'default_month' => $this->defaultMonth(),
            'month_options' => $this->monthOptions(),
            'year_options' => $this->yearOptions(),
        ];
    }

    public function importFile(string $path, string $filename, string $month, string $importedBy): array
    {
        $rows = $this->readRows($path);

        if ($rows === []) {
            throw new RuntimeException('Fail tidak mempunyai rekod untuk diimport.');
        }

        $created = 0;
        $updated = 0;

        DB::transaction(function () use ($rows, $filename, $month, $importedBy, &$created, &$updated): void {
            foreach ($rows as $row) {
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

        return [
            'created' => $created,
            'updated' => $updated,
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

    public function updateCula(PemilihBaruRecord $record, string $code): void
    {
        $label = CulaCodes::label($code);

        DB::transaction(function () use ($record, $code, $label): void {
            $record->forceFill([
                'cula_code' => $code,
                'cula_display_label' => $label,
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
            'kod_dun' => $this->nullable($this->value($row, ['Kod DUN'])),
            'nama_dun' => $this->nullable($this->value($row, ['Nama DUN'])),
            'kod_dm' => $this->nullable($this->value($row, ['Kod DM'])),
            'dm' => $dm,
            'kod_lokaliti' => $this->nullable($this->value($row, ['Kod Lok', 'Kod Lokaliti'])),
            'locality' => $locality,
            'transaction' => $transaction,
            'no_kp' => $noKp ?: null,
            'id_lain' => $idLain ?: null,
            'gender' => $this->nullable($this->value($row, ['Jantina'])),
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

    private function readRows(string $path): array
    {
        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException('Fail pemilih baharu tidak dapat dibaca.');
        }

        if (str_contains(strtolower(substr($contents, 0, 500)), '<table')) {
            return $this->readHtmlRows($contents);
        }

        require_once base_path('vendor/nuovo/spreadsheet-reader/SpreadsheetReader.php');

        $reader = new \SpreadsheetReader($path);
        $headers = [];
        $rows = [];

        foreach ($reader as $sheetRow) {
            $cells = array_map(fn ($cell) => $this->cleanCell($cell), $sheetRow);

            if ($cells === [] || count(array_filter($cells, fn (string $cell) => $cell !== '')) === 0) {
                continue;
            }

            if ($headers === []) {
                $headers = array_map(fn (string $header) => $this->normalizeHeader($header), $cells);
                $this->assertHeaders($headers);

                continue;
            }

            $rows[] = $this->combineRow($headers, $cells);
        }

        return $rows;
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
                $headers = array_map(fn (string $header) => $this->normalizeHeader($header), $cells);
                $this->assertHeaders($headers);

                continue;
            }

            $rows[] = $this->combineRow($headers, $cells);
        }

        return $rows;
    }

    private function combineRow(array $headers, array $cells): array
    {
        $cells = array_slice(array_pad($cells, count($headers), ''), 0, count($headers));

        return array_combine($headers, $cells) ?: [];
    }

    private function assertHeaders(array $headers): void
    {
        if (! in_array('nama', $headers, true) && ! in_array('nama pemilih', $headers, true)) {
            throw new RuntimeException('Lajur Nama tidak dijumpai dalam fail pemilih baharu.');
        }

        $hasIdentity = count(array_intersect($headers, [
            'no kp',
            'no. kp',
            'no k/p',
            'no. k/p (baru)',
            'no k/p (baru)',
            'id lain',
            'no id',
            'id',
        ])) > 0;

        if (! $hasIdentity) {
            throw new RuntimeException('Lajur No KP atau ID Lain tidak dijumpai dalam fail pemilih baharu.');
        }
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
}
