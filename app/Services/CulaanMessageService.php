<?php

namespace App\Services;

use Carbon\Carbon;

class CulaanMessageService
{
    private const DIGIT_EMOJIS = [
        '0' => '0️⃣',
        '1' => '1️⃣',
        '2' => '2️⃣',
        '3' => '3️⃣',
        '4' => '4️⃣',
        '5' => '5️⃣',
        '6' => '6️⃣',
        '7' => '7️⃣',
        '8' => '8️⃣',
        '9' => '9️⃣',
    ];

    public function build(array $report, ?Carbon $date = null): string
    {
        $summary = $report['summary'] ?? [];
        $date ??= now('Asia/Kuala_Lumpur');

        $lines = [
            '📌CULAN TERKINI JPrD JENERI '.$date->format('j/n/y'),
            '',
            '♦️JUM PEMILIH',
            $this->formatNumber($summary['total_voters'] ?? 0),
            '♦️SUDAH CULA',
            $this->formatNumber($summary['with_cula'] ?? 0),
            '♦️BELUM CULA',
            $this->formatNumber($summary['belum_dicula'] ?? 0),
            '♦️PERATUP SIAP',
            $this->formatPercent($summary['coverage_percent'] ?? 0),
            '',
            '📌BELUM CULA IKUT UDM',
        ];

        foreach ($report['by_dm'] ?? [] as $index => $udm) {
            $lines[] = ($index + 1).') '.($udm['name'] ?? 'Tanpa DM').' '.$this->formatNumber($udm['belum_dicula'] ?? 0).'🌸';
        }

        $lines[] = '';
        $lines[] = '🟩JUMLAH KESELURUHAN';
        $lines[] = $this->formatNumber($summary['belum_dicula'] ?? 0);
        $lines[] = '';
        $lines[] = '🌸Terima kasih atas komitmen UDM.. Ayuh kita Selesaikan.. Anda semua terbaik';

        return implode("\n", $lines);
    }

    public function buildAhliPasSalahCula(array $byUdm, ?Carbon $date = null): string
    {
        $date ??= now('Asia/Kuala_Lumpur');
        $total = 0;

        $lines = [
            '📌BAKI SEMAKAN AHLI PAS UDM '.$date->format('j/n/y'),
            '',
            '♦️BELUM SEMAK IKUT UDM',
        ];

        foreach ($byUdm as $index => $udm) {
            $count = (int) ($udm['total'] ?? 0);
            $total += $count;
            $lines[] = ($index + 1).') '.($udm['udm'] ?? 'Tidak Ditetapkan').' '.$this->formatNumber($count).'🌸';
        }

        $lines[] = '';
        $lines[] = '🟩JUMLAH KESELURUHAN';
        $lines[] = $this->formatNumber($total);
        $lines[] = '';
        $lines[] = '🌸Terima kasih atas komitmen UDM.. Ayuh kita Selesaikan.. Anda semua terbaik';

        return implode("\n", $lines);
    }

    public function buildPusatKhidmatStatus(array $counts, ?Carbon $date = null): string
    {
        $date ??= now('Asia/Kuala_Lumpur');

        return implode("\n", [
            '📌STATUS DATA KHIDMAT '.$date->format('j/n/y'),
            '',
            '♦️BELUM CULA',
            $this->formatNumber($counts['belum_cula'] ?? 0),
            '♦️TELAH CULA',
            $this->formatNumber($counts['telah_cula'] ?? 0),
            '',
            '🟩JUMLAH BELUM SEMAK',
            $this->formatNumber($counts['total'] ?? 0),
        ]);
    }

    private function formatNumber(int|float|string $value): string
    {
        return strtr(number_format((float) $value, 0, '.', ', '), self::DIGIT_EMOJIS);
    }

    private function formatPercent(int|float|string $value): string
    {
        $formatted = number_format((float) $value, 1, '.', '');
        $formatted = rtrim(rtrim($formatted, '0'), '.');

        return strtr($formatted, self::DIGIT_EMOJIS + ['.' => '▪️']);
    }
}
