<?php

namespace App\Services;

use App\Models\Hashtag;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

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
        $ids = [];

        foreach ($names as $name) {
            $ids[] = Hashtag::query()->firstOrCreate(['name' => $name])->getKey();
        }

        $record->hashtags()->sync($ids);

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

    public function suggestions(?string $query, ?User $user = null, bool $includeManual = true, int $limit = 20): array
    {
        $search = mb_strtolower(trim((string) $query));
        $search = ltrim($search, '#');

        $builder = Hashtag::query()
            ->whereHas('pemilihRecords', function (Builder $voterQuery) use ($user, $includeManual) {
                $voterQuery->where('status', 'aktif');

                if (! $includeManual) {
                    $voterQuery->where('is_manual', false);
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

    public function available(?User $user = null, bool $includeManual = true): array
    {
        return $this->suggestions('', $user, $includeManual, 1000);
    }
}
