<?php

namespace App\Services;

use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Models\User;
use App\Support\CulaCodes;
use Illuminate\Database\Eloquent\Builder;

class PlkCostService
{
    public const CODES = ['3U', '3D', '3P', '3K', '3B', '3M'];

    public function rates(): array
    {
        $stored = json_decode((string) Setting::valueOf('plk_rates', '{}'), true);
        $rates = array_fill_keys(self::CODES, 0);

        if (is_array($stored)) {
            foreach (self::CODES as $code) {
                if (isset($stored[$code]) && is_numeric($stored[$code]) && (float) $stored[$code] >= 0) {
                    $rates[$code] = round((float) $stored[$code], 2);
                }
            }
        }

        return $rates;
    }

    public function rows(Builder $base, array $rates, array $udms): array
    {
        $grouped = [];
        $empty = [
            'counts' => array_fill_keys(self::CODES, 0),
            'amounts' => array_fill_keys(self::CODES, 0),
            'total' => 0,
        ];

        foreach ($udms as $udm) {
            $grouped[$udm] = ['udm' => $udm, ...$empty];
        }

        (clone $base)
            ->select(['dm', 'cula_code'])
            ->selectRaw('COUNT(*) as quantity')
            ->groupBy('dm', 'cula_code')
            ->get()
            ->each(function ($record) use (&$grouped, $rates, $empty): void {
                $udm = trim((string) $record->dm);
                $udm = $udm !== '' && $udm !== '-' ? $udm : 'UDM TIDAK DINYATAKAN';
                $code = (string) $record->cula_code;
                $grouped[$udm] ??= ['udm' => $udm, ...$empty];
                $quantity = (int) $record->quantity;
                $amount = round($quantity * (float) ($rates[$code] ?? 0), 2);
                $grouped[$udm]['counts'][$code] = $quantity;
                $grouped[$udm]['amounts'][$code] = $amount;
                $grouped[$udm]['total'] = round($grouped[$udm]['total'] + $amount, 2);
            });

        return collect($grouped)->sortKeys()->values()->all();
    }

    public function summary(User $user): array
    {
        $active = PemilihRecord::query()->where('status', 'aktif');
        $user->applyScopeToPemilihQuery($active);
        $udms = (clone $active)->whereNotNull('dm')->where('dm', '!=', '')->where('dm', '!=', '-')
            ->distinct()->orderBy('dm')->pluck('dm')->all();
        $rates = $this->rates();
        $rows = $this->rows((clone $active)->whereIn('cula_code', self::CODES), $rates, $udms);
        $totals = ['counts' => array_fill_keys(self::CODES, 0), 'amounts' => array_fill_keys(self::CODES, 0), 'total' => 0];

        foreach ($rows as $row) {
            foreach (self::CODES as $code) {
                $totals['counts'][$code] += $row['counts'][$code];
                $totals['amounts'][$code] = round($totals['amounts'][$code] + $row['amounts'][$code], 2);
            }
            $totals['total'] = round($totals['total'] + $row['total'], 2);
        }

        return [
            'codes' => array_map(fn (string $code) => ['code' => $code, 'label' => CulaCodes::label($code)], self::CODES),
            'rates' => $rates,
            'rows' => $rows,
            'totals' => $totals,
        ];
    }
}
