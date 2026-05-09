<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Support\ModuleRegistry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $masterAdminRole = Role::query()->firstOrCreate(
            ['slug' => 'master-admin'],
            [
                'name' => 'Master Admin',
                'is_master_admin' => true,
                'access_modules' => ModuleRegistry::keys(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'admin@jprd'],
            [
                'name' => 'Admin LR JPRD',
                'email_verified_at' => now(),
                'password' => Hash::make('123'),
                'role_id' => $masterAdminRole->id,
            ],
        );
    }
}
