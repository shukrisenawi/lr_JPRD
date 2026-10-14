<?php

namespace App\Services;

use App\Models\PemilihRecord;
use App\Models\User;
use App\Support\CulaCodes;

class DashboardUdmService
{
    public function summary(User $user): array
    {
        // Never fall back to an unscoped report when the UDM has not been assigned.
        $query = PemilihRecord::query()->where('dm', $user->scope_key)
            ->where('status', 'aktif')->where('is_manual', false);
        if (blank($user->scope_key)) {
            $query->whereRaw('1 = 0');
        }

        $groups = $query->select('locality', 'cula_code')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN no_ahli IS NOT NULL AND TRIM(no_ahli) NOT IN ('', '-') THEN 1 ELSE 0 END) as members")
            ->groupBy('locality', 'cula_code')->get();
        $rows = [];
        $codes = [];
        foreach ($groups as $group) {
            $locality = trim((string) $group->locality) ?: 'Tanpa Lokaliti';
            $code = strtoupper(trim((string) $group->cula_code));
            $code = in_array($code, ['', '?', 'TIADA', '0'], true) ? '?' : $code;
            $rows[$locality] ??= ['locality' => $locality, 'total' => 0, 'with_cula' => 0, 'without_cula' => 0, 'members' => 0, 'breakdown' => []];
            $rows[$locality]['total'] += (int) $group->total;
            $rows[$locality]['members'] += (int) $group->members;
            $rows[$locality][$code === '?' ? 'without_cula' : 'with_cula'] += (int) $group->total;
            $rows[$locality]['breakdown'][$code] = ($rows[$locality]['breakdown'][$code] ?? 0) + (int) $group->total;
            $codes[$code] = CulaCodes::label($code);
        }
        ksort($rows, SORT_NATURAL | SORT_FLAG_CASE);
        ksort($codes, SORT_NATURAL);
        $totals = ['total' => 0, 'with_cula' => 0, 'without_cula' => 0, 'members' => 0, 'breakdown' => []];
        foreach ($rows as &$row) {
            $row['percentage'] = round($row['with_cula'] / $row['total'] * 100, 1);
            foreach (['total', 'with_cula', 'without_cula', 'members'] as $key) {
                $totals[$key] += $row[$key];
            }
            foreach ($row['breakdown'] as $code => $count) {
                $totals['breakdown'][$code] = ($totals['breakdown'][$code] ?? 0) + $count;
            }
        }
        unset($row);
        $totals['percentage'] = $totals['total'] ? round($totals['with_cula'] / $totals['total'] * 100, 1) : 0;

        return ['rows' => array_values($rows), 'totals' => $totals, 'codes' => collect($codes)->map(fn ($label, $code) => ['code' => (string) $code, 'label' => $label])->values()->all()];
    }
}
