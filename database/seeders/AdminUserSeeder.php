<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@lrjprd.local'],
            [
                'name' => 'Admin LR JPRD',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
        );
    }
}
