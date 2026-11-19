<?php

namespace App\Services;

use App\Models\GroupPemilih;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class PemilihGroupSummaryService
{
    public function summary(User $user): array
    {
        $groups = GroupPemilih::with('kodCulas')->orderBy('sort_order')->get();

        return collect([
            'FTV' => ['ftv', 'first time voter'],
            'Muda' => ['muda'],
            'Ulung' => ['ulung'],
            'Warga Emas' => ['warga emas'],
        ])->map(function (array $names, string $label) use ($groups, $user) {
            $matching = $groups->filter(function (GroupPemilih $group) use ($names) {
                $name = strtolower(trim($group->nama_group));

                foreach ($names as $prefix) {
                    if ($name === $prefix || str_starts_with($name, $prefix.' ')) {
                        return true;
                    }
                }

                return false;
            });

            $query = PemilihRecord::query()
                ->where('status', '!=', 'xaktif')
                ->where('is_manual', false);
            $user->applyScopeToPemilihQuery($query);
            $this->applyGroups($query, $matching);

            $counts = $query->select('gender')->selectRaw('COUNT(*) as total')
                ->groupBy('gender')->pluck('total', 'gender');

            return [
                'label' => $label,
                'total' => (int) $counts->sum(),
                'male' => (int) ($counts['L'] ?? 0),
                'female' => (int) ($counts['P'] ?? 0),
            ];
        })->values()->all();
    }

    private function applyGroups(Builder $query, Collection $groups): void
    {
        if ($groups->isEmpty()) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where(function (Builder $query) use ($groups) {
            foreach ($groups as $group) {
                $query->orWhere(function (Builder $query) use ($group) {
                    if ($group->keturunan) {
                        $query->where('race', $group->keturunan);
                    }
                    // Older FTV Perempuan settings can have an empty gender.
                    $gender = $group->jantina;
                    if (! $gender && str_ends_with(strtolower(trim($group->nama_group)), ' perempuan')) {
                        $gender = 'P';
                    } elseif (! $gender && str_ends_with(strtolower(trim($group->nama_group)), ' lelaki')) {
                        $gender = 'L';
                    }
                    if ($gender) {
                        $query->where('gender', $gender);
                    }
                    if ($group->kodCulas->isNotEmpty()) {
                        $query->whereIn('cula_code', $group->kodCulas->pluck('kod_cula'));
                    }
                    if ($group->umur_dari !== null || $group->umur_akhir !== null) {
                        $prefixes = [];
                        for ($yy = 0; $yy <= 99; $yy++) {
                            $age = now()->year - (($yy > (int) now()->format('y') ? 1900 : 2000) + $yy);
                            if ($age >= ($group->umur_dari ?? 0) && $age <= ($group->umur_akhir ?? 999)) {
                                $prefixes[] = str_pad((string) $yy, 2, '0', STR_PAD_LEFT);
                            }
                        }
                        if ($prefixes === []) {
                            $query->whereRaw('1 = 0');
                        } else {
                            $query->where(function (Builder $query) use ($prefixes) {
                                foreach ($prefixes as $prefix) {
                                    $query->orWhere('no_kp', 'like', $prefix.'%');
                                }
                            });
                        }
                    }
                });
            }
        });
    }
}
