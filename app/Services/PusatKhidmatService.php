<?php

namespace App\Services;

use App\Models\PemilihRecord;
use App\Models\PusatKhidmatData;
use App\Models\Setting;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class PusatKhidmatService
{
    public const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_2uM_knp2IvyPG5dxGYhSGXU1nY5FpDslj2khQeA_k8/edit?usp=sharing';

    public function getSheetUrl(): string
    {
        return Setting::valueOf('pusat_khidmat_sheet_url', self::DEFAULT_SHEET_URL);
    }

    public function updateSheetUrl(string $url): void
    {
        Setting::setValue('pusat_khidmat_sheet_url', $url);
    }

    public function fetchAndSync(): array
    {
        $sheetUrl = $this->getSheetUrl();
        $csvUrl = $this->toCsvExportUrl($sheetUrl);
        $sheetKey = md5($sheetUrl);

        $response = Http::timeout(30)
            ->accept('text/csv')
            ->get($csvUrl);

        if ($response->failed()) {
            throw new RuntimeException('Gagal mendapatkan data daripada Google Sheet.');
        }

        $lines = array_values(array_filter(
            preg_split("/\r\n|\n|\r/", trim($response->body())) ?: [],
            fn (string $line) => trim($line) !== '',
        ));

        if (count($lines) < 2) {
            return [
                'headers' => [],
                'records' => [],
                'sheet_key' => $sheetKey,
                'sheet_url' => $sheetUrl,
                'csv_url' => $csvUrl,
                'new_count' => 0,
                'updated_count' => 0,
                'total_count' => 0,
            ];
        }

        $headers = array_map(
            fn ($header) => Str::of((string) $header)->trim()->toString(),
            str_getcsv(array_shift($lines)),
        );

        $newCount = 0;
        $updatedCount = 0;

        DB::transaction(function () use ($lines, $headers, $sheetKey, &$newCount, &$updatedCount) {
            $existingFingerprints = PusatKhidmatData::query()
                ->where('sheet_key', $sheetKey)
                ->pluck('row_fingerprint', 'row_key')
                ->all();

            $processedRowKeys = [];

            foreach ($lines as $index => $line) {
                $values = str_getcsv($line);
                $row = [];

                foreach ($headers as $headerIndex => $header) {
                    $row[$header] = trim((string) ($values[$headerIndex] ?? ''));
                }

                if (array_key_exists('no_kp', $row)) {
                    $row['no_kp'] = $this->normalizeNoKp($row['no_kp']);
                }

                $fingerprint = sha1(json_encode($row, JSON_UNESCAPED_UNICODE));
                $processedRowKeys[] = $fingerprint;

                $existingFingerprint = $existingFingerprints[$fingerprint] ?? null;

                if ($existingFingerprint === null) {
                    $pemilihRecordId = null;
                    if (!empty($row['no_kp'])) {
                        $pemilihRecordId = PemilihRecord::query()
                            ->where('no_kp', $row['no_kp'])
                            ->orWhere('identity_number', $row['no_kp'])
                            ->value('id');
                    }

                    PusatKhidmatData::query()->create([
                        'sheet_key' => $sheetKey,
                        'row_key' => $fingerprint,
                        'row_fingerprint' => $fingerprint,
                        'position' => $index + 1,
                        'no_kp' => $row['no_kp'] ?? null,
                        'pemilih_record_id' => $pemilihRecordId,
                        'payload' => $row,
                        'status' => 'aktif',
                    ]);

                    $newCount++;
                } elseif ($existingFingerprint !== $fingerprint) {
                    $pemilihRecordId = null;
                    if (!empty($row['no_kp'])) {
                        $pemilihRecordId = PemilihRecord::query()
                            ->where('no_kp', $row['no_kp'])
                            ->orWhere('identity_number', $row['no_kp'])
                            ->value('id');
                    }

                    PusatKhidmatData::query()->where('row_key', $fingerprint)->update([
                        'row_fingerprint' => $fingerprint,
                        'position' => $index + 1,
                        'no_kp' => $row['no_kp'] ?? null,
                        'pemilih_record_id' => $pemilihRecordId,
                        'payload' => $row,
                    ]);

                    $updatedCount++;
                }
            }

            if (!empty($processedRowKeys)) {
                PusatKhidmatData::query()
                    ->where('sheet_key', $sheetKey)
                    ->whereNotIn('row_key', $processedRowKeys)
                    ->update(['status' => 'xaktif']);
            }
        });

        $records = PusatKhidmatData::query()
            ->with('pemilihRecord')
            ->where('sheet_key', $sheetKey)
            ->where('status', 'aktif')
            ->orderBy('position')
            ->get()
            ->map(fn (PusatKhidmatData $record) => $this->formatRecord($record))
            ->all();

        return [
            'headers' => $headers,
            'records' => $records,
            'sheet_key' => $sheetKey,
            'sheet_url' => $sheetUrl,
            'csv_url' => $csvUrl,
            'new_count' => $newCount,
            'updated_count' => $updatedCount,
            'total_count' => count($records),
        ];
    }

    public function getRecords(): array
    {
        $sheetUrl = $this->getSheetUrl();
        $sheetKey = md5($sheetUrl);

        $records = PusatKhidmatData::query()
            ->with('pemilihRecord')
            ->where('sheet_key', $sheetKey)
            ->where('status', 'aktif')
            ->orderBy('position')
            ->get()
            ->map(fn (PusatKhidmatData $record) => $this->formatRecord($record))
            ->all();

        return [
            'records' => $records,
            'sheet_key' => $sheetKey,
            'sheet_url' => $sheetUrl,
            'total_count' => count($records),
        ];
    }

    private function formatRecord(PusatKhidmatData $record): array
    {
        $pemilih = $record->pemilihRecord;

        return [
            'id' => $record->id,
            'row_key' => $record->row_key,
            'position' => $record->position,
            'no_kp' => $record->no_kp,
            'payload' => $record->payload,
            'status' => $record->status,
            'pemilih' => $pemilih ? [
                'id' => $pemilih->id,
                'name' => $pemilih->name,
                'no_kp' => $pemilih->no_kp,
                'dm' => $pemilih->dm,
                'locality' => $pemilih->locality,
                'no_rumah' => $pemilih->no_rumah,
                'cula_code' => $pemilih->cula_code,
                'cula_display_label' => $pemilih->cula_display_label,
                'status' => $pemilih->status,
            ] : null,
            'linked' => $pemilih !== null,
        ];
    }

    public function toCsvExportUrl(string $sheetUrl): string
    {
        if (str_contains($sheetUrl, '/export?format=csv')) {
            return $sheetUrl;
        }

        preg_match('/\/d\/([a-zA-Z0-9-_]+)/', $sheetUrl, $matches);

        if (!isset($matches[1])) {
            throw new RuntimeException('URL Google Sheet tidak sah.');
        }

        $gid = null;
        $queryString = parse_url($sheetUrl, PHP_URL_QUERY);

        if ($queryString) {
            parse_str($queryString, $queryParams);
            $gid = $queryParams['gid'] ?? null;
        }

        $baseUrl = 'https://docs.google.com/spreadsheets/d/' . $matches[1] . '/export?format=csv';

        return $gid !== null ? $baseUrl . '&gid=' . $gid : $baseUrl;
    }

    private function normalizeNoKp(string $noKp): string
    {
        if ($noKp === '' || !ctype_digit($noKp) || strlen($noKp) >= 12) {
            return $noKp;
        }

        return str_pad($noKp, 12, '0', STR_PAD_LEFT);
    }
}
