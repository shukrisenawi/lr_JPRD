<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Support\ModuleRegistry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

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

        $admin = User::query()->firstOrNew(['email' => 'admin@jprd']);
        $admin->name = 'Admin PAS SIK';
        $admin->email_verified_at = $admin->email_verified_at ?? now();
        $admin->role_id = $masterAdminRole->id;

        if (! $admin->exists) {
            $initialPassword = (string) config('app.admin_initial_password');
            if (trim($initialPassword) === '') {
                throw new RuntimeException('Tetapkan ADMIN_INITIAL_PASSWORD sebelum menjalankan AdminUserSeeder.');
            }

            $admin->password = Hash::make($initialPassword);
            $admin->must_change_password = true;
        }

        $admin->save();
    }
}
