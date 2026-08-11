<?php

namespace App\Services;

use App\Models\SpokasMigrationRun;
use Illuminate\Support\Facades\DB;

class SpokasMigrationService
{
    /**
     * Match SPoKAS members in chunks and persist each result row immediately.
     *
     * @return array{source_count: int, updated_count: int, ic_match_count: int, name_match_count: int, failed_count: int}
     */
    public function migrate(SpokasMigrationRun $run): array
    {
        $byIc = [];
        $byName = [];
        $pemilihById = [];

        DB::table('pemilih_records')
            ->select(['id', 'identity_number', 'name', 'no_kp', 'no_ahli'])
            ->orderBy('id')
            ->chunkById(1000, function ($records) use (&$byIc, &$byName, &$pemilihById): void {
                foreach ($records as $record) {
                    $id = (int) $record->id;
                    $pemilihById[$id] = [
                        'id' => $id,
                        'identity_number' => $record->identity_number,
                        'name' => $record->name,
                        'no_kp' => $record->no_kp,
                        'no_ahli' => $record->no_ahli,
                    ];

                    $icKey = $this->normalizeIc($record->no_kp);
                    $nameKey = $this->normalizeName($record->name);

                    if ($icKey !== '') {
                        $byIc[$icKey][] = $id;
                    }

                    if ($nameKey !== '') {
                        $byName[$nameKey][] = $id;
                    }
                }
            });

        $summary = [
            'source_count' => 0,
            'updated_count' => 0,
            'ic_match_count' => 0,
            'name_match_count' => 0,
            'failed_count' => 0,
        ];
        $assignedPemilih = [];

        DB::table('spokas_members')
            ->select(['id', 'name', 'member_number', 'ic_birth'])
            ->orderBy('id')
            ->chunkById(500, function ($members) use (&$summary, &$assignedPemilih, $byIc, $byName, $pemilihById, $run): void {
                $updates = [];
                $results = [];
                $now = now();

                foreach ($members as $member) {
                    $summary['source_count']++;
                    $base = [
                        'spokas_migration_run_id' => $run->id,
                        'spokas_member_id' => $member->id,
                        'name' => $member->name,
                        'member_number' => $member->member_number,
                        'ic_birth' => $member->ic_birth,
                        'category' => null,
                        'match_by' => null,
                        'pemilih_id' => null,
                        'pemilih_name' => null,
                        'pemilih_no_kp' => null,
                        'previous_no_ahli' => null,
                        'reason' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $memberNumber = $this->cleanValue($member->member_number);

                    if ($memberNumber === '') {
                        $results[] = array_merge($base, [
                            'category' => 'failed',
                            'reason' => 'No. ahli SPoKAS kosong.',
                        ]);
                        $summary['failed_count']++;

                        continue;
                    }

                    $icKey = $this->normalizeIc($member->ic_birth);
                    $icCandidates = $icKey === '' ? [] : ($byIc[$icKey] ?? []);
                    $matchType = null;
                    $candidates = $icCandidates;
                    $reason = null;

                    if (count($icCandidates) === 1) {
                        $matchType = 'ic';
                    } elseif (count($icCandidates) > 1) {
                        $reason = 'No. K/P sepadan dengan lebih daripada satu rekod pemilih.';
                    } else {
                        $nameKey = $this->normalizeName($member->name);
                        $candidates = $nameKey === '' ? [] : ($byName[$nameKey] ?? []);

                        if (count($candidates) === 1) {
                            $matchType = 'name';
                        } elseif (count($candidates) > 1) {
                            $reason = 'Nama sepadan dengan lebih daripada satu rekod pemilih.';
                        } else {
                            $reason = 'Tiada padanan berdasarkan IC atau nama.';
                        }
                    }

                    if ($matchType === null || ! isset($candidates[0])) {
                        $results[] = array_merge($base, [
                            'category' => 'failed',
                            'reason' => $reason,
                        ]);
                        $summary['failed_count']++;

                        continue;
                    }

                    $pemilihId = (int) $candidates[0];
                    $record = $pemilihById[$pemilihId] ?? null;

                    if ($record === null || isset($assignedPemilih[$pemilihId])) {
                        $results[] = array_merge($base, [
                            'category' => 'failed',
                            'reason' => 'Rekod pemilih telah dipadankan oleh rekod SPoKAS lain.',
                        ]);
                        $summary['failed_count']++;

                        continue;
                    }

                    $assignedPemilih[$pemilihId] = true;
                    $updates[] = [
                        'id' => $pemilihId,
                        'identity_number' => $record['identity_number'],
                        'no_ahli' => $memberNumber,
                        'updated_at' => $now,
                    ];
                    $results[] = array_merge($base, [
                        'category' => $matchType,
                        'match_by' => $matchType,
                        'pemilih_id' => $pemilihId,
                        'pemilih_name' => $record['name'],
                        'pemilih_no_kp' => $record['no_kp'],
                        'previous_no_ahli' => $record['no_ahli'],
                    ]);
                    $summary[$matchType === 'ic' ? 'ic_match_count' : 'name_match_count']++;
                    $summary['updated_count']++;
                }

                DB::transaction(function () use ($updates, $results): void {
                    if ($updates !== []) {
                        DB::table('pemilih_records')->upsert($updates, ['id'], ['no_ahli', 'updated_at']);
                    }

                    if ($results !== []) {
                        DB::table('spokas_migration_results')->insert($results);
                    }
                });
            });

        return $summary;
    }

    /**
     * Clear the No. Ahli values imported from the current SPoKAS member list.
     */
    public function rollback(): int
    {
        return DB::transaction(function (): int {
            $memberNumbers = DB::table('spokas_members')
                ->whereNotNull('member_number')
                ->pluck('member_number')
                ->map(fn (mixed $number) => $this->cleanValue($number))
                ->filter()
                ->unique();
            $clearedCount = 0;

            foreach ($memberNumbers->chunk(500) as $numbers) {
                $clearedCount += DB::table('pemilih_records')
                    ->whereIn('no_ahli', $numbers->all())
                    ->update([
                        'no_ahli' => null,
                        'updated_at' => now(),
                    ]);
            }

            SpokasMigrationRun::query()->delete();

            return $clearedCount;
        });
    }

    private function cleanValue(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function normalizeIc(mixed $value): string
    {
        return preg_replace('/\D+/', '', $this->cleanValue($value)) ?? '';
    }

    private function normalizeName(mixed $value): string
    {
        $value = preg_replace('/\s+/u', ' ', $this->cleanValue($value)) ?? '';

        return mb_strtoupper($value, 'UTF-8');
    }
}
