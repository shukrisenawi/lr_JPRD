<?php

namespace App\Services;

use App\Models\SpokasMigrationResult;
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
        $indexes = $this->buildPemilihIndexes();
        $pemilihById = $indexes['pemilih_by_id'];

        $summary = [
            'source_count' => 0,
            'updated_count' => 0,
            'ic_match_count' => 0,
            'name_match_count' => 0,
            'failed_count' => 0,
        ];
        $assignedPemilih = [];

        DB::table('spokas_members')
            ->select(['id', 'name', 'member_number', 'ic_birth', 'ic_old'])
            ->orderBy('id')
            ->chunkById(500, function ($members) use (&$summary, &$assignedPemilih, $indexes, $pemilihById, $run): void {
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
                        'ic_old' => $member->ic_old,
                        'category' => null,
                        'match_by' => null,
                        'pemilih_id' => null,
                        'pemilih_name' => null,
                        'pemilih_no_kp' => null,
                        'pemilih_old_ic' => null,
                        'previous_no_ahli' => null,
                        'reason' => null,
                        'remark' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $memberNumber = $this->cleanValue($member->member_number);

                    if ($memberNumber === '') {
                        $results[] = array_merge($base, [
                            'category' => 'not_found',
                            'reason' => 'No. ahli SPoKAS kosong.',
                        ]);
                        $summary['failed_count']++;

                        continue;
                    }

                    $match = $this->findPemilihMatch(
                        $member->name,
                        $member->ic_birth,
                        $member->ic_old,
                        $indexes,
                    );

                    if ($match['type'] === null || $match['id'] === null) {
                        $results[] = array_merge($base, [
                            'category' => 'not_found',
                            'reason' => $match['reason'],
                        ]);
                        $summary['failed_count']++;

                        continue;
                    }

                    $pemilihId = $match['id'];
                    $record = $pemilihById[$pemilihId] ?? null;

                    if ($record === null || isset($assignedPemilih[$pemilihId])) {
                        $results[] = array_merge($base, [
                            'category' => 'not_found',
                            'reason' => 'Rekod pemilih telah dipadankan oleh rekod SPoKAS lain.',
                        ]);
                        $summary['failed_count']++;

                        continue;
                    }

                    if ($match['type'] === 'ic') {
                        $assignedPemilih[$pemilihId] = true;
                        $updates[] = [
                            'id' => $pemilihId,
                            'identity_number' => $record['identity_number'],
                            'no_ahli' => $memberNumber,
                            'updated_at' => $now,
                        ];
                    }
                    $results[] = array_merge($base, [
                        'category' => $match['type'],
                        'match_by' => $match['type'],
                        'pemilih_id' => $pemilihId,
                        'pemilih_name' => $record['name'],
                        'pemilih_no_kp' => $record['no_kp'],
                        'pemilih_old_ic' => $record['old_ic'],
                        'previous_no_ahli' => $record['no_ahli'],
                    ]);
                    $summary[$match['type'] === 'ic' ? 'ic_match_count' : 'name_match_count']++;
                    if ($match['type'] === 'ic') {
                        $summary['updated_count']++;
                    }
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
     * Retry only the records that were not found by the latest migration run.
     *
     * @return array{matched_count: int, updated_count: int, ic_match_count: int, name_match_count: int}
     */
    public function retryNotFound(): array
    {
        $run = SpokasMigrationRun::query()->latest('id')->first();
        $summary = [
            'matched_count' => 0,
            'updated_count' => 0,
            'ic_match_count' => 0,
            'name_match_count' => 0,
        ];

        if ($run === null) {
            return $summary;
        }

        $indexes = $this->buildPemilihIndexes();
        $runId = $run->id;

        DB::transaction(function () use (&$summary, $indexes, $runId): void {
            $run = SpokasMigrationRun::query()->lockForUpdate()->findOrFail($runId);
            $assignedPemilih = SpokasMigrationResult::query()
                ->where('spokas_migration_run_id', $run->id)
                ->whereIn('category', ['ic', 'approved'])
                ->whereNotNull('pemilih_id')
                ->pluck('pemilih_id')
                ->map(fn (mixed $id): int => (int) $id)
                ->all();
            $assignedPemilih = array_fill_keys($assignedPemilih, true);

            SpokasMigrationResult::query()
                ->where('spokas_migration_run_id', $run->id)
                ->where('category', 'not_found')
                ->orderBy('id')
                ->lockForUpdate()
                ->chunkById(500, function ($results) use (&$summary, &$assignedPemilih, $indexes): void {
                    foreach ($results as $result) {
                        if ($this->cleanValue($result->member_number) === '') {
                            continue;
                        }

                        $match = $this->findPemilihMatch(
                            $result->name,
                            $result->ic_birth,
                            $result->ic_old,
                            $indexes,
                        );

                        if ($match['type'] === null || $match['id'] === null) {
                            continue;
                        }

                        $pemilihId = $match['id'];
                        $record = $indexes['pemilih_by_id'][$pemilihId] ?? null;

                        if ($record === null || isset($assignedPemilih[$pemilihId])) {
                            continue;
                        }

                        if ($match['type'] === 'ic') {
                            $assignedPemilih[$pemilihId] = true;
                            DB::table('pemilih_records')
                                ->where('id', $pemilihId)
                                ->update([
                                    'no_ahli' => $result->member_number,
                                    'updated_at' => now(),
                                ]);
                        }

                        $result->update([
                            'category' => $match['type'],
                            'match_by' => $match['type'],
                            'pemilih_id' => $pemilihId,
                            'pemilih_name' => $record['name'],
                            'pemilih_no_kp' => $record['no_kp'],
                            'pemilih_old_ic' => $record['old_ic'],
                            'previous_no_ahli' => $record['no_ahli'],
                            'reason' => null,
                            'remark' => null,
                        ]);

                        $summary['matched_count']++;
                        $summary[$match['type'] === 'ic' ? 'ic_match_count' : 'name_match_count']++;

                        if ($match['type'] === 'ic') {
                            $summary['updated_count']++;
                        }
                    }
                });

            if ($summary['matched_count'] > 0) {
                $run->update([
                    'updated_count' => (int) $run->updated_count + $summary['updated_count'],
                    'ic_match_count' => (int) $run->ic_match_count + $summary['ic_match_count'],
                    'name_match_count' => (int) $run->name_match_count + $summary['name_match_count'],
                    'failed_count' => max(0, (int) $run->failed_count - $summary['matched_count']),
                    'executed_at' => now(),
                ]);
            }
        });

        return $summary;
    }

    /**
     * @return array{by_no_kp: array<string, array<int, int>>, by_old_ic: array<string, array<int, int>>, by_name: array<string, array<int, int>>, pemilih_by_id: array<int, array<string, mixed>>}
     */
    private function buildPemilihIndexes(): array
    {
        $byNoKp = [];
        $byOldIc = [];
        $byName = [];
        $pemilihById = [];

        DB::table('pemilih_records')
            ->select(['id', 'identity_number', 'name', 'no_kp', 'old_ic', 'no_ahli'])
            ->orderBy('id')
            ->chunkById(1000, function ($records) use (&$byNoKp, &$byOldIc, &$byName, &$pemilihById): void {
                foreach ($records as $record) {
                    $id = (int) $record->id;
                    $pemilihById[$id] = [
                        'id' => $id,
                        'identity_number' => $record->identity_number,
                        'name' => $record->name,
                        'no_kp' => $record->no_kp,
                        'old_ic' => $record->old_ic,
                        'no_ahli' => $record->no_ahli,
                    ];

                    $noKpKey = $this->normalizeIc($record->no_kp);
                    $oldIcKey = $this->normalizeOldIc($record->old_ic);
                    $nameKey = $this->normalizeName($record->name);

                    if ($noKpKey !== '') {
                        $byNoKp[$noKpKey][] = $id;
                    }

                    if ($oldIcKey !== '') {
                        $byOldIc[$oldIcKey][] = $id;
                    }

                    if ($nameKey !== '') {
                        $byName[$nameKey][] = $id;
                    }
                }
            });

        return [
            'by_no_kp' => $byNoKp,
            'by_old_ic' => $byOldIc,
            'by_name' => $byName,
            'pemilih_by_id' => $pemilihById,
        ];
    }

    /**
     * @param  array{by_no_kp: array<string, array<int, int>>, by_old_ic: array<string, array<int, int>>, by_name: array<string, array<int, int>>}  $indexes
     * @return array{type: ?string, id: ?int, reason: ?string}
     */
    private function findPemilihMatch(mixed $name, mixed $icBirth, mixed $icOld, array $indexes): array
    {
        $birthIcKey = $this->normalizeIc($icBirth);
        $oldIcKey = $this->normalizeOldIc($icOld);
        $icCandidates = array_values(array_unique(array_merge(
            $birthIcKey === '' ? [] : ($indexes['by_no_kp'][$birthIcKey] ?? []),
            $oldIcKey === '' ? [] : ($indexes['by_old_ic'][$oldIcKey] ?? []),
        )));

        if (count($icCandidates) === 1) {
            return [
                'type' => 'ic',
                'id' => (int) $icCandidates[0],
                'reason' => null,
            ];
        }

        if (count($icCandidates) > 1) {
            return [
                'type' => null,
                'id' => null,
                'reason' => 'IC SPoKAS sepadan dengan lebih daripada satu rekod pemilih.',
            ];
        }

        $nameKey = $this->normalizeName($name);
        $nameCandidates = $nameKey === '' ? [] : ($indexes['by_name'][$nameKey] ?? []);

        if (count($nameCandidates) === 1) {
            return [
                'type' => 'name',
                'id' => (int) $nameCandidates[0],
                'reason' => null,
            ];
        }

        return [
            'type' => null,
            'id' => null,
            'reason' => count($nameCandidates) > 1
                ? 'Nama sepadan dengan lebih daripada satu rekod pemilih.'
                : 'Tiada padanan berdasarkan IC atau nama.',
        ];
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

    private function normalizeOldIc(mixed $value): string
    {
        $value = mb_strtoupper($this->cleanValue($value), 'UTF-8');

        return preg_replace('/[^A-Z0-9]+/', '', $value) ?? '';
    }

    private function normalizeName(mixed $value): string
    {
        $value = preg_replace('/\s+/u', ' ', $this->cleanValue($value)) ?? '';

        return mb_strtoupper($value, 'UTF-8');
    }
}
