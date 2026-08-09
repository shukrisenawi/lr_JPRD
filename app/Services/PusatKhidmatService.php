<?php

namespace App\Services;

use App\Models\PemilihRecord;
use App\Models\PusatKhidmatData;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class PusatKhidmatService
{
    public const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_2uM_knp2IvyPG5dxGYhSGXU1nY5FpDslj2khQeA_k8/edit?usp=sharing';

    private const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

    public function getSheetUrl(): string
    {
        return Setting::valueOf('pusat_khidmat_sheet_url', self::DEFAULT_SHEET_URL);
    }

    public function updateSheetUrl(string $url): void
    {
        Setting::setValue('pusat_khidmat_sheet_url', $url);
    }

    public function fetchAndSync(?User $user = null): array
    {
        $sheetUrl = $this->getSheetUrl();
        $sheetId = $this->extractSheetId($sheetUrl);
        $sheetKey = md5($sheetUrl);

        $rows = $this->fetchSheetRows($sheetId);

        if (empty($rows)) {
            return [
                'headers' => [],
                'records' => [],
                'sheet_key' => $sheetKey,
                'sheet_url' => $sheetUrl,
                'new_count' => 0,
                'updated_count' => 0,
                'total_count' => 0,
            ];
        }

        $headers = array_shift($rows);
        $headers = array_map(fn ($h) => Str::of((string) $h)->trim()->toString(), $headers);

        $newCount = 0;
        $updatedCount = 0;

        DB::transaction(function () use ($rows, $headers, $sheetKey, &$newCount, &$updatedCount) {
            $existingFingerprints = PusatKhidmatData::query()
                ->where('sheet_key', $sheetKey)
                ->pluck('row_fingerprint', 'row_key')
                ->all();

            $processedRowKeys = [];

            foreach ($rows as $index => $values) {
                $row = [];
                foreach ($headers as $headerIndex => $header) {
                    $row[$header] = trim((string) ($values[$headerIndex] ?? ''));
                }

                $noKp = $this->extractNoKp($row);
                if ($noKp !== null) {
                    $row['no_kp'] = $noKp;
                }

                $fingerprint = sha1(json_encode($row, JSON_UNESCAPED_UNICODE));
                $processedRowKeys[] = $fingerprint;

                $existingFingerprint = $existingFingerprints[$fingerprint] ?? null;

                if ($existingFingerprint === null) {
                    $pemilihRecordId = null;
                    if (! empty($row['no_kp'])) {
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
                    if (! empty($row['no_kp'])) {
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

            if (! empty($processedRowKeys)) {
                PusatKhidmatData::query()
                    ->where('sheet_key', $sheetKey)
                    ->where('is_manual', false)
                    ->whereNotIn('row_key', $processedRowKeys)
                    ->update(['status' => 'xaktif']);
            }
        });

        $records = $this->buildRecordsQuery($user)
            ->get()
            ->map(fn (PusatKhidmatData $record) => $this->formatRecord($record))
            ->all();

        return [
            'headers' => $headers,
            'records' => $records,
            'sheet_key' => $sheetKey,
            'sheet_url' => $sheetUrl,
            'new_count' => $newCount,
            'updated_count' => $updatedCount,
            'total_count' => count($records),
        ];
    }

    public function getRecords(?User $user = null): array
    {
        try {
            $this->autoSyncIfNeeded();
        } catch (\Throwable $e) {
            Log::warning('PusatKhidmat autoSyncIfNeeded gagal: '.$e->getMessage());
        }

        $sheetUrl = $this->getSheetUrl();
        $sheetKey = md5($sheetUrl);

        $records = $this->buildRecordsQuery($user)
            ->get()
            ->map(fn (PusatKhidmatData $record) => $this->formatRecord($record))
            ->all();

        $udms = $this->availableUdms($records);
        $localities = $this->availableLocalities($records);

        return [
            'records' => $records,
            'sheet_key' => $sheetKey,
            'sheet_url' => $sheetUrl,
            'total_count' => count($records),
            'udms' => $udms,
            'localities' => $localities,
        ];
    }

    public function createManualRecord(array $data, User $user): PusatKhidmatData
    {
        return DB::transaction(function () use ($data, $user): PusatKhidmatData {
            $noKp = $this->normalizeNoKp((string) $data['no_kp']);
            $sheetKey = md5($this->getSheetUrl());

            $duplicate = PusatKhidmatData::query()
                ->where('is_manual', true)
                ->where('no_kp', $noKp)
                ->where('status', 'aktif')
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'no_kp' => 'Data manual dengan No KP ini sudah wujud.',
                ]);
            }

            $pemilih = PemilihRecord::query()
                ->where('no_kp', $noKp)
                ->orWhere('identity_number', $noKp)
                ->orWhere('old_ic', $noKp)
                ->first();

            if (! $pemilih) {
                $pemilih = PemilihRecord::query()->create([
                    'identity_number' => $noKp,
                    'no_kp' => $noKp,
                    'name' => $data['name'],
                    'phone_mobile' => $data['phone'] ?? null,
                    'address' => $data['address'] ?? null,
                    'status' => 'aktif',
                    'is_manual' => true,
                    'created_by' => $user->id,
                ]);
            }

            $payload = [
                'NAMA PEMOHON' => $data['name'],
                'NO KAD PENGENALAN' => $noKp,
                'NO TELEFON' => $data['phone'] ?? '',
                'ALAMAT' => $data['address'] ?? '',
                'UNIVERSITI' => $data['university'] ?? '',
                'BIDANG' => $data['bidang'] ?? '',
                'TARIKH PERMOHONAN' => $data['tarikh_permohonan'] ?? '',
            ];
            $rowKey = 'manual-'.Str::uuid()->toString();

            return PusatKhidmatData::query()->create([
                'sheet_key' => $sheetKey,
                'row_key' => $rowKey,
                'row_fingerprint' => sha1(json_encode($payload, JSON_UNESCAPED_UNICODE).$rowKey),
                'position' => ((int) PusatKhidmatData::query()
                    ->where(function ($query) use ($sheetKey) {
                        $query->where('sheet_key', $sheetKey)
                            ->orWhere('is_manual', true);
                    })
                    ->max('position')) + 1,
                'no_kp' => $noKp,
                'pemilih_record_id' => $pemilih->id,
                'payload' => $payload,
                'status' => 'aktif',
                'is_manual' => true,
            ]);
        });
    }

    private function buildRecordsQuery(?User $user)
    {
        $sheetKey = md5($this->getSheetUrl());
        $query = PusatKhidmatData::query()
            ->with('pemilihRecord')
            ->where(function ($query) use ($sheetKey) {
                $query->where('sheet_key', $sheetKey)
                    ->orWhere('is_manual', true);
            })
            ->where('status', 'aktif')
            ->orderBy('position');

        $scope = $user?->accessScope();

        if ($scope !== null) {
            $query->whereHas('pemilihRecord', function ($q) use ($scope) {
                if (filled($scope['dm'])) {
                    $q->where('dm', $scope['dm']);
                }
                if (filled($scope['locality'])) {
                    $q->where('locality', $scope['locality']);
                }
            });
        }

        return $query;
    }

    public function autoSyncIfNeeded(): void
    {
        $lastSyncAt = Setting::valueOf('pusat_khidmat_last_sync_at');
        $now = now();

        if (! $lastSyncAt) {
            $this->fetchAndSync();
            Setting::setValue('pusat_khidmat_last_sync_at', $now->toDateTimeString());

            return;
        }

        $lastSync = Carbon::parse($lastSyncAt);
        $hoursSinceSync = $lastSync->diffInHours($now);

        if ($hoursSinceSync >= 24) {
            $this->fetchAndSync();
            Setting::setValue('pusat_khidmat_last_sync_at', $now->toDateTimeString());
        }
    }

    private function availableUdms(array $records): array
    {
        $udms = [];
        foreach ($records as $record) {
            $dm = $record['pemilih']['dm'] ?? null;
            if ($dm && ! in_array($dm, $udms, true)) {
                $udms[] = $dm;
            }
        }
        sort($udms);

        return $udms;
    }

    private function availableLocalities(array $records): array
    {
        $localities = [];
        foreach ($records as $record) {
            $locality = $record['pemilih']['locality'] ?? null;
            if ($locality && ! in_array($locality, $localities, true)) {
                $localities[] = $locality;
            }
        }
        sort($localities);

        return $localities;
    }

    public function formatRecord(PusatKhidmatData $record): array
    {
        $pemilih = $record->pemilihRecord;

        return [
            'id' => $record->id,
            'row_key' => $record->row_key,
            'position' => $record->position,
            'no_kp' => $record->no_kp,
            'payload' => $record->payload,
            'status' => $record->status,
            'checked_at' => $record->checked_at ? $record->checked_at->toDateTimeString() : null,
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

    private function fetchSheetRows(string $sheetId): array
    {
        $token = $this->getAccessToken();

        $metaResponse = Http::withToken($token)
            ->timeout(30)
            ->accept('application/json')
            ->get("https://sheets.googleapis.com/v4/spreadsheets/{$sheetId}");

        if ($metaResponse->failed()) {
            throw new RuntimeException('Gagal mendapatkan metadata Google Sheet: '.$metaResponse->body());
        }

        $sheets = $metaResponse->json('sheets', []);
        if (empty($sheets)) {
            throw new RuntimeException('Google Sheet tidak mempunyai sebarang tab.');
        }

        $firstTab = $sheets[0]['properties']['title'] ?? 'Sheet1';

        $response = Http::withToken($token)
            ->timeout(30)
            ->accept('application/json')
            ->get("https://sheets.googleapis.com/v4/spreadsheets/{$sheetId}/values/".rawurlencode($firstTab));

        if ($response->failed()) {
            throw new RuntimeException('Gagal mendapatkan data daripada Google Sheet: '.$response->body());
        }

        return $response->json('values', []);
    }

    private function getAccessToken(): string
    {
        $keyPath = storage_path('app/service-account.json');

        if (! file_exists($keyPath)) {
            throw new RuntimeException('Fail service-account.json tidak dijumpai di storage/app/. Sila letak JSON key Service Account.');
        }

        $credentials = new ServiceAccountCredentials(self::SCOPES, $keyPath);
        $token = $credentials->fetchAuthToken();

        if (empty($token['access_token'])) {
            throw new RuntimeException('Gagal mendapatkan access token dari Service Account.');
        }

        return $token['access_token'];
    }

    private function extractSheetId(string $sheetUrl): string
    {
        preg_match('/\/d\/([a-zA-Z0-9-_]+)/', $sheetUrl, $matches);

        if (! isset($matches[1])) {
            throw new RuntimeException('URL Google Sheet tidak sah.');
        }

        return $matches[1];
    }

    private function extractNoKp(array $row): ?string
    {
        $possibleKeys = ['no_kp', 'NO KAD PENGENALAN', 'no_kad_pengenalan', 'nokp', 'ic', 'no_ic'];

        foreach ($possibleKeys as $key) {
            if (! empty($row[$key])) {
                return $this->normalizeNoKp($row[$key]);
            }
        }

        return null;
    }

    public function normalizeNoKp(string $noKp): string
    {
        $noKp = str_replace(['-', ' ', "\t"], '', $noKp);

        if ($noKp === '' || ! ctype_digit($noKp) || strlen($noKp) >= 12) {
            return $noKp;
        }

        return str_pad($noKp, 12, '0', STR_PAD_LEFT);
    }
}
