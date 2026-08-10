<?php

namespace App\Services;

use App\Models\Hashtag;
use App\Models\PemilihRecord;
use App\Models\ProgramSubProgram;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class HashtagService
{
    private const TAG_PATTERN = '/^#[\pL\pN_][\pL\pN_-]*$/u';

    public static function normalizeTag(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (! str_starts_with($value, '#')) {
            $value = '#'.$value;
        }

        $value = '#'.ltrim($value, '#');
        $value = mb_strtolower($value);

        return preg_match(self::TAG_PATTERN, $value) === 1 ? $value : null;
    }

    public static function normalizeTags(mixed $values): array
    {
        if (! is_array($values)) {
            return [];
        }

        $tags = [];
        foreach ($values as $value) {
            $tag = self::normalizeTag(is_string($value) ? $value : null);

            if ($tag !== null && ! in_array($tag, $tags, true)) {
                $tags[] = $tag;
            }
        }

        return $tags;
    }

    public function sync(PemilihRecord $record, mixed $values): array
    {
        $names = self::normalizeTags($values);
        $ids = $this->resolveIds($names);

        $this->syncSource($record, $ids, 'is_manual');

        return $this->namesForIds($ids);
    }

    public function attach(PemilihRecord $record, mixed $values): array
    {
        $names = self::normalizeTags($values);
        $ids = $this->resolveIds($names);

        foreach ($ids as $id) {
            DB::table('hashtag_pemilih_record')->updateOrInsert(
                ['hashtag_id' => $id, 'pemilih_record_id' => $record->id],
                ['is_manual' => true],
            );
        }

        return $this->namesForIds($ids);
    }

    public function syncProgramAssignments(PemilihRecord $record): array
    {
        $names = ProgramSubProgram::query()
            ->whereHas('attendees', fn (Builder $query) => $query->where('voter_id', (string) $record->id))
            ->pluck('name')
            ->all();
        $ids = $this->resolveIds(self::normalizeTags($names));

        $this->syncSource($record, $ids, 'is_program');

        return $this->namesForIds($ids);
    }

    private function resolveIds(array $names): array
    {
        return array_map(
            fn (string $name) => Hashtag::query()->firstOrCreate(['name' => $name])->getKey(),
            $names,
        );
    }

    private function namesForIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $namesById = Hashtag::query()
            ->whereIn('id', $ids)
            ->pluck('name', 'id');

        return array_values(array_map(
            fn (int $id) => $namesById[$id],
            $ids,
        ));
    }

    private function syncSource(PemilihRecord $record, array $ids, string $source): void
    {
        DB::transaction(function () use ($record, $ids, $source) {
            DB::table('hashtag_pemilih_record')
                ->where('pemilih_record_id', $record->id)
                ->where($source, true)
                ->update([$source => false]);

            foreach ($ids as $id) {
                $attributes = ['hashtag_id' => $id, 'pemilih_record_id' => $record->id];
                $exists = DB::table('hashtag_pemilih_record')->where($attributes)->exists();

                if ($exists) {
                    DB::table('hashtag_pemilih_record')->where($attributes)->update([$source => true]);
                } else {
                    DB::table('hashtag_pemilih_record')->insert([
                        ...$attributes,
                        'is_manual' => $source === 'is_manual',
                        'is_program' => $source === 'is_program',
                    ]);
                }
            }

            DB::table('hashtag_pemilih_record')
                ->where('pemilih_record_id', $record->id)
                ->where('is_manual', false)
                ->where('is_program', false)
                ->delete();
        });
    }

    public function suggestions(?string $query, ?User $user = null, bool $includeManual = true, int $limit = 20, ?string $dm = null, ?string $locality = null): array
    {
        $search = mb_strtolower(trim((string) $query));
        $search = ltrim($search, '#');

        $builder = Hashtag::query()
            ->whereHas('pemilihRecords', function (Builder $voterQuery) use ($user, $includeManual, $dm, $locality) {
                $voterQuery->where('pemilih_records.status', 'aktif');

                if (! $includeManual) {
                    $voterQuery->where('pemilih_records.is_manual', false);
                }

                if (filled($dm)) {
                    $voterQuery->where('dm', $dm);
                }

                if (filled($locality)) {
                    $voterQuery->where('locality', $locality);
                }

                $user?->applyScopeToPemilihQuery($voterQuery);
            });

        if ($search !== '') {
            $builder->where('name', 'like', '%'.addcslashes($search, '%_\\').'%');
        }

        return $builder
            ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', ['#'.$search.'%'])
            ->orderBy('name')
            ->limit($limit)
            ->pluck('name')
            ->values()
            ->all();
    }

    public function available(?User $user = null, bool $includeManual = true, ?string $dm = null, ?string $locality = null): array
    {
        return $this->suggestions('', $user, $includeManual, 1000, $dm, $locality);
    }

    public function availableWithCounts(Builder $voterQuery, ?User $user = null, ?string $dm = null, ?string $locality = null): array
    {
        $voterIds = (clone $voterQuery)->select('pemilih_records.id');
        $counts = DB::table('hashtag_pemilih_record as hpr')
            ->whereIn('hpr.pemilih_record_id', $voterIds)
            ->select('hpr.hashtag_id', DB::raw('COUNT(DISTINCT hpr.pemilih_record_id) as total'))
            ->groupBy('hpr.hashtag_id')
            ->pluck('total', 'hashtag_id');
        $availableVoterIds = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->when(filled($dm), fn (Builder $query) => $query->where('dm', $dm))
            ->when(filled($locality), fn (Builder $query) => $query->where('locality', $locality))
            ->select('pemilih_records.id');

        $user?->applyScopeToPemilihQuery($availableVoterIds);

        return Hashtag::query()
            ->whereIn('id', DB::table('hashtag_pemilih_record as available_hpr')
                ->select('available_hpr.hashtag_id')
                ->whereIn('available_hpr.pemilih_record_id', $availableVoterIds))
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Hashtag $hashtag) => [
                'name' => $hashtag->name,
                'count' => (int) ($counts[$hashtag->id] ?? 0),
            ])
            ->values()
            ->all();
    }
}
