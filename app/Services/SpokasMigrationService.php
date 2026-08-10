<?php

namespace App\Services;

use App\Models\PemilihRecord;
use App\Models\SpokasMember;
use Illuminate\Support\Facades\DB;

class SpokasMigrationService
{
    /**
     * Match every SPoKAS member to one pemilih record and update no_ahli.
     *
     * @return array{source_count: int, updated_count: int, ic_matches: array<int, array<string, mixed>>, name_matches: array<int, array<string, mixed>>, failed: array<int, array<string, mixed>>}
     */
    public function migrate(): array
    {
        $spokasMembers = SpokasMember::query()
            ->select(['id', 'name', 'member_number', 'ic_birth'])
            ->orderBy('id')
            ->get();

        $pemilihRecords = PemilihRecord::query()
            ->select(['id', 'identity_number', 'name', 'no_kp', 'no_ahli'])
            ->orderBy('id')
            ->get();

        $byIc = [];
        $byName = [];

        foreach ($pemilihRecords as $record) {
            $icKey = $this->normalizeIc($record->no_kp);
            $nameKey = $this->normalizeName($record->name);

            if ($icKey !== '') {
                $byIc[$icKey][] = $record;
            }

            if ($nameKey !== '') {
                $byName[$nameKey][] = $record;
            }
        }

        $icMatches = [];
        $nameMatches = [];
        $failed = [];
        $updates = [];
        $assignedPemilih = [];
        $now = now();

        foreach ($spokasMembers as $member) {
            $base = [
                'spokas_id' => $member->id,
                'name' => $member->name,
                'member_number' => $member->member_number,
                'ic_birth' => $member->ic_birth,
            ];
            $memberNumber = $this->cleanValue($member->member_number);

            if ($memberNumber === '') {
                $failed[] = $base + ['reason' => 'No. ahli SPoKAS kosong.'];

                continue;
            }

            $icKey = $this->normalizeIc($member->ic_birth);
            $icCandidates = $icKey === '' ? [] : ($byIc[$icKey] ?? []);
            $matchType = null;
            $candidates = $icCandidates;

            if (count($icCandidates) === 1) {
                $matchType = 'ic';
            } elseif (count($icCandidates) > 1) {
                $failed[] = $base + ['reason' => 'No. K/P sepadan dengan lebih daripada satu rekod pemilih.'];

                continue;
            } else {
                $nameKey = $this->normalizeName($member->name);
                $candidates = $nameKey === '' ? [] : ($byName[$nameKey] ?? []);

                if (count($candidates) === 1) {
                    $matchType = 'nama';
                } elseif (count($candidates) > 1) {
                    $failed[] = $base + ['reason' => 'Nama sepadan dengan lebih daripada satu rekod pemilih.'];

                    continue;
                }
            }

            if ($matchType === null || ! isset($candidates[0])) {
                $failed[] = $base + ['reason' => 'Tiada padanan berdasarkan IC atau nama.'];

                continue;
            }

            $record = $candidates[0];

            if (isset($assignedPemilih[$record->id])) {
                $failed[] = $base + ['reason' => 'Rekod pemilih telah dipadankan oleh rekod SPoKAS lain.'];

                continue;
            }

            $assignedPemilih[$record->id] = true;
            $updates[] = [
                'id' => $record->id,
                'identity_number' => $record->identity_number,
                'no_ahli' => $memberNumber,
                'updated_at' => $now,
            ];

            $result = $base + [
                'match_by' => $matchType,
                'pemilih_id' => $record->id,
                'pemilih_name' => $record->name,
                'pemilih_no_kp' => $record->no_kp,
                'previous_no_ahli' => $record->no_ahli,
            ];

            if ($matchType === 'ic') {
                $icMatches[] = $result;
            } else {
                $nameMatches[] = $result;
            }
        }

        DB::transaction(function () use ($updates): void {
            foreach (array_chunk($updates, 500) as $chunk) {
                DB::table('pemilih_records')->upsert($chunk, ['id'], ['no_ahli', 'updated_at']);
            }
        });

        return [
            'source_count' => $spokasMembers->count(),
            'updated_count' => count($updates),
            'ic_matches' => $icMatches,
            'name_matches' => $nameMatches,
            'failed' => $failed,
        ];
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
