<?php

namespace App\Services;

use App\Models\Cawangan;
use App\Models\Dana;
use App\Models\PemilihRecord;
use App\Models\User;

class DanaSummaryService
{
    public function summary(User $user): array
    {
        $scope = $user->accessScope();
        $scopedUdm = trim((string) ($scope['dm'] ?? ''));
        $dana = Dana::query();
        $cawangan = Cawangan::query();
        if ($scopedUdm !== '') {
            $dana->where('udm', $scopedUdm);
            $cawangan->where('udm', $scopedUdm);
        }
        $voters = PemilihRecord::query()->where('status', 'aktif')->where('is_manual', false);
        $user->applyScopeToPemilihQuery($voters);

        $amounts = $dana->select('udm')
            ->selectRaw('COUNT(*) as record_count')
            ->selectRaw("SUM(CASE WHEN jenis = 'masuk' THEN jumlah ELSE 0 END) as total_masuk")
            ->selectRaw("SUM(CASE WHEN jenis = 'keluar' THEN jumlah ELSE 0 END) as total_keluar")
            ->groupBy('udm')->get()->keyBy('udm');
        $udms = $voters->whereNotNull('dm')->select('dm')->distinct()->pluck('dm')
            ->merge($cawangan->select('udm')->distinct()->pluck('udm'))
            ->merge($amounts->keys())->push($scopedUdm)
            ->map(fn ($udm) => trim((string) $udm))
            ->filter(fn (string $udm) => $udm !== '' && $udm !== '-')
            ->unique()->sort()->values();
        $rows = $udms->map(function (string $udm) use ($amounts): array {
            $amount = $amounts->get($udm);
            $masuk = (float) ($amount?->total_masuk ?? 0);
            $keluar = (float) ($amount?->total_keluar ?? 0);

            return [
                'udm' => $udm,
                'count' => (int) ($amount?->record_count ?? 0),
                'total_masuk' => number_format($masuk, 2, '.', ''),
                'total_keluar' => number_format($keluar, 2, '.', ''),
                'baki' => number_format($masuk - $keluar, 2, '.', ''),
            ];
        });

        return [
            'rows' => $rows->all(),
            'totals' => [
                'count' => $rows->sum('count'),
                'total_masuk' => number_format($rows->sum('total_masuk'), 2, '.', ''),
                'total_keluar' => number_format($rows->sum('total_keluar'), 2, '.', ''),
                'baki' => number_format($rows->sum('baki'), 2, '.', ''),
            ],
        ];
    }
}
