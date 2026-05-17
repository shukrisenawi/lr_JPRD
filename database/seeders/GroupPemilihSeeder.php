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
            ['nama_group' => 'Pengundi Muda Lelaki', 'keturunan' => 'M', 'jantina' => 'L', 'umur_dari' => 18, 'umur_akhir' => 39, 'sort_order' => 1],
            ['nama_group' => 'Pengundi Muda Perempuan', 'keturunan' => 'M', 'jantina' => 'P', 'umur_dari' => 18, 'umur_akhir' => 39, 'sort_order' => 2],
            ['nama_group' => 'Pengundi Ulung Lelaki', 'keturunan' => 'M', 'jantina' => 'L', 'umur_dari' => 40, 'umur_akhir' => 60, 'sort_order' => 3],
            ['nama_group' => 'Pengundi Ulung Perempuan', 'keturunan' => 'M', 'jantina' => 'P', 'umur_dari' => 40, 'umur_akhir' => 60, 'sort_order' => 4],
            ['nama_group' => 'Pengundi Warga Emas Lelaki', 'keturunan' => 'M', 'jantina' => 'L', 'umur_dari' => 61, 'umur_akhir' => 100, 'sort_order' => 5],
            ['nama_group' => 'Pengundi Warga Emas Perempuan', 'keturunan' => 'M', 'jantina' => 'P', 'umur_dari' => 61, 'umur_akhir' => 100, 'sort_order' => 6],
        ];

        foreach ($groups as $group) {
            GroupPemilih::query()->firstOrCreate(
                ['nama_group' => $group['nama_group']],
                [...$group, 'user_id' => $userId],
            );
        }
    }
}
