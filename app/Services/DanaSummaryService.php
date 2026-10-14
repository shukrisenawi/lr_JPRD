<?php

namespace App\Services;

use App\Models\Cawangan;
use App\Models\Dana;
use App\Models\PemilihRecord;
use App\Models\User;

class DanaSummaryService
{
    public const PAYMENT_CATEGORY = 'BAYARAN DUIT PERALATAN PILIHANRAYA PRU16';

    public function summary(User $user): array
    {
        $scope = $user->accessScope();
        $scopedUdm = trim((string) ($scope['dm'] ?? ''));
        $dana = Dana::query()->where('jenis', 'masuk')
            ->whereHas('kategori', fn ($query) => $query->whereRaw('UPPER(TRIM(name)) = ?', [self::PAYMENT_CATEGORY]));
        $cawangan = Cawangan::query();
        if ($scopedUdm !== '') {
            $dana->where('udm', $scopedUdm);
            $cawangan->where('udm', $scopedUdm);
        }
        $voters = PemilihRecord::query()->where('status', 'aktif')->where('is_manual', false);
        $user->applyScopeToPemilihQuery($voters);

        $amounts = $dana->select('udm')
            ->selectRaw('COUNT(*) as record_count')
            ->selectRaw('SUM(jumlah) as total_bayaran')
            ->groupBy('udm')->get()->keyBy('udm');
        $udms = $voters->whereNotNull('dm')->select('dm')->distinct()->pluck('dm')
            ->merge($cawangan->select('udm')->distinct()->pluck('udm'))
            ->merge($amounts->keys())->push($scopedUdm)
            ->map(fn ($udm) => trim((string) $udm))
            ->filter(fn (string $udm) => $udm !== '' && $udm !== '-')
            ->unique()->sort()->values();
        $rows = $udms->map(function (string $udm) use ($amounts): array {
            $amount = $amounts->get($udm);

            return [
                'udm' => $udm,
                'count' => (int) ($amount?->record_count ?? 0),
                'total_bayaran' => number_format((float) ($amount?->total_bayaran ?? 0), 2, '.', ''),
            ];
        });

        return [
            'category' => self::PAYMENT_CATEGORY,
            'rows' => $rows->all(),
            'totals' => [
                'count' => $rows->sum('count'),
                'total_bayaran' => number_format($rows->sum('total_bayaran'), 2, '.', ''),
            ],
        ];
    }
}
