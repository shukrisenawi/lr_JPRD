<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SpokasMemberImportService
{
    /**
     * Import one complete export or one chunk from the SPoKAS list.
     *
     * @return array{source_key: string, rows_received: int, rows_written: int, pages: int, status_counts: array<string, int>}
     */
    public function import(array $document, bool $replace = false): array
    {
        $meta = $document['meta'] ?? [];
        $rows = $document['rows'] ?? null;

        if (! is_array($meta) || ! is_array($rows)) {
            throw new InvalidArgumentException('Dokumen mesti mempunyai objek meta dan rows.');
        }

        $sourceKey = $this->requiredString($meta['source_key'] ?? null, 'meta.source_key', 100);
        $capturedAt = $this->capturedAt($meta['captured_at'] ?? null);
        $now = now();
        $prepared = [];
        $statusCounts = [];

        foreach ($rows as $index => $row) {
            if (! is_array($row)) {
                throw new InvalidArgumentException("Rekod pada index {$index} tidak sah.");
            }

            $page = $this->positiveInteger($row['page_number'] ?? null, "rows.{$index}.page_number");
            $position = $this->positiveInteger(
                $row['page_position'] ?? ($row['source_position'] ?? null),
                "rows.{$index}.page_position"
            );
            $status = $this->nullableString($row['status'] ?? null, 80);
            $key = implode(':', [$sourceKey, $page, $position]);

            $prepared[$key] = [
                'source_key' => $sourceKey,
                'source_page' => $page,
                'source_position' => $position,
                'source_record_id' => $this->nullableString(
                    $row['record_id'] ?? ($row['source_record_id'] ?? null),
                    64
                ),
                'name' => $this->nullableString($row['name'] ?? null, 255),
                'member_number' => $this->nullableString(
                    $row['member_no'] ?? ($row['member_number'] ?? null),
                    64
                ),
                'ic_birth' => $this->nullableString(
                    $row['nric_birth'] ?? ($row['ic_birth'] ?? null),
                    32
                ),
                'ic_old' => $this->nullableString(
                    $row['nric_old'] ?? ($row['ic_old'] ?? null),
                    64
                ),
                'status' => $status,
                'profile_url' => $this->nullableString(
                    $row['source_url'] ?? ($row['profile_url'] ?? null),
                    2048
                ),
                'captured_at' => $capturedAt,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $statusKey = $status ?? '(kosong)';
            $statusCounts[$statusKey] = ($statusCounts[$statusKey] ?? 0) + 1;
        }

        $records = array_values($prepared);

        DB::transaction(function () use ($records, $sourceKey, $replace): void {
            if ($replace) {
                DB::table('spokas_members')
                    ->where('source_key', $sourceKey)
                    ->delete();
            }

            foreach (array_chunk($records, 500) as $chunk) {
                DB::table('spokas_members')->upsert(
                    $chunk,
                    ['source_key', 'source_page', 'source_position'],
                    [
                        'source_record_id',
                        'name',
                        'member_number',
                        'ic_birth',
                        'ic_old',
                        'status',
                        'profile_url',
                        'captured_at',
                        'updated_at',
                    ]
                );
            }
        });

        return [
            'source_key' => $sourceKey,
            'rows_received' => count($rows),
            'rows_written' => count($records),
            'pages' => count(array_unique(array_column($records, 'source_page'))),
            'status_counts' => $statusCounts,
        ];
    }

    private function requiredString(mixed $value, string $field, int $maxLength): string
    {
        $value = $this->nullableString($value, $maxLength);

        if ($value === null) {
            throw new InvalidArgumentException("{$field} diperlukan.");
        }

        return $value;
    }

    private function nullableString(mixed $value, int $maxLength): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : mb_substr($value, 0, $maxLength);
    }

    private function positiveInteger(mixed $value, string $field): int
    {
        $value = filter_var($value, FILTER_VALIDATE_INT);

        if ($value === false || $value < 1) {
            throw new InvalidArgumentException("{$field} mesti integer positif.");
        }

        return $value;
    }

    private function capturedAt(mixed $value): ?Carbon
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        try {
            return Carbon::parse((string) $value);
        } catch (\Throwable $exception) {
            throw new InvalidArgumentException('meta.captured_at tidak sah.', previous: $exception);
        }
    }
}
