<?php

namespace Database\Seeders;

use App\Models\GroupPemilih;
use App\Models\User;
use Illuminate\Database\Seeder;

class GroupPemilihSeeder extends Seeder
{
    public function run(): void
    {
        $userId = User::query()->value('id');

        if (! $userId) {
            return;
        }

        $groups = [
            ['nama_group' => 'First Time Voter Lelaki',    'keturunan' => 'M', 'jantina' => 'L', 'umur_dari' => 18, 'umur_akhir' => 22, 'sort_order' => 1, 'show_in_culaan_report' => false],
            ['nama_group' => 'First Time Voter Perempuan',  'keturunan' => 'M', 'jantina' => null, 'umur_dari' => 18, 'umur_akhir' => 22, 'sort_order' => 2, 'show_in_culaan_report' => false],
            ['nama_group' => 'Muda Lelaki',                'keturunan' => 'M', 'jantina' => 'L', 'umur_dari' => 23, 'umur_akhir' => 39, 'sort_order' => 3, 'show_in_culaan_report' => true],
            ['nama_group' => 'Muda Perempuan',              'keturunan' => 'M', 'jantina' => 'P', 'umur_dari' => 23, 'umur_akhir' => 39, 'sort_order' => 4, 'show_in_culaan_report' => true],
            ['nama_group' => 'Ulung Lelaki',                'keturunan' => 'M', 'jantina' => 'L', 'umur_dari' => 40, 'umur_akhir' => 60, 'sort_order' => 5, 'show_in_culaan_report' => true],
            ['nama_group' => 'Ulung Perempuan',             'keturunan' => 'M', 'jantina' => 'P', 'umur_dari' => 40, 'umur_akhir' => 60, 'sort_order' => 6, 'show_in_culaan_report' => true],
            ['nama_group' => 'Warga Emas Lelaki',           'keturunan' => 'M', 'jantina' => 'L', 'umur_dari' => 61, 'umur_akhir' => 100, 'sort_order' => 7, 'show_in_culaan_report' => true],
            ['nama_group' => 'Warga Emas Perempuan',        'keturunan' => 'M', 'jantina' => 'P', 'umur_dari' => 61, 'umur_akhir' => 100, 'sort_order' => 8, 'show_in_culaan_report' => true],
        ];

        foreach ($groups as $group) {
            GroupPemilih::query()->firstOrCreate(
                ['nama_group' => $group['nama_group']],
                [...$group, 'user_id' => $userId],
            );
        }
    }
}
