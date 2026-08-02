<?php

namespace App\Support;

final class CulaCodes
{
    private const LABELS = [
        '1' => 'UMNO',
        '10' => 'PPBM',
        '11' => 'GERAKAN',
        '12' => 'PEJUANG',
        '13' => 'MCA',
        '14' => 'MIC',
        '15' => 'PUTRA',
        '16' => 'MUDA',
        '1A' => 'UMNO - SASARAN / LEMAH / ATAS PAGAR',
        '1B' => 'UMNO SOKONG PAS',
        '1P' => 'UMNO SOKONG PN (TIDAK SOKONG PAS)',
        '2' => 'PAS',
        '3B' => 'PAS LUAR KEDAH (BORNEO)',
        '3D' => 'PAS LUAR DUN',
        '3K' => 'PAS LUAR KEDAH (SEMENANJUNG)',
        '3M' => 'PAS LUAR MALAYSIA',
        '3P' => 'PAS LUAR PARLIMEN',
        '3U' => 'PAS LUAR UDM',
        '4' => 'ATAS PAGAR',
        '4P' => 'ATAS PAGAR SOKONG PN',
        '5' => 'PKR',
        '6' => 'DHPP',
        '7' => 'TIDAK DIKENALI',
        '7P' => 'TIDAK DIKENALI (POLIS / TENTERA)',
        '8' => 'MATI',
        '9' => 'PAN DAP',
        '97' => 'LAIN-LAIN BANGSA',
        '98' => 'INDIA',
        '99' => 'CINA',
    ];

    public static function options(): array
    {
        return collect(self::LABELS)
            ->map(fn (string $label, string $code) => [
                'code' => $code,
                'label' => $code.' - '.$label,
            ])
            ->values()
            ->all();
    }

    public static function label(string $code): string
    {
        return self::LABELS[$code] ?? ($code === '0' || $code === '?' ? 'BELUM DICULA' : $code);
    }
}
