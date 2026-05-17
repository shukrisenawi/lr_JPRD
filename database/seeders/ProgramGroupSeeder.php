<?php

namespace Database\Seeders;

use App\Models\ProgramGroup;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProgramGroupSeeder extends Seeder
{
    public function run(): void
    {
        $userId = User::query()->value('id');

        if (! $userId) {
            return;
        }

        $groups = [
            ['name' => 'Ziarah'],
            ['name' => 'Mesyuarat JPrD'],
        ];

        foreach ($groups as $group) {
            ProgramGroup::query()->firstOrCreate(
                ['name' => $group['name']],
                ['user_id' => $userId],
            );
        }
    }
}
