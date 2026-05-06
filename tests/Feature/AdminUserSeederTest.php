<?php

use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('creates or updates the default admin user from seeder', function () {
    $this->seed(AdminUserSeeder::class);

    $admin = User::query()->where('email', 'admin@jprd')->first();

    expect($admin)->not->toBeNull();
    expect($admin->name)->toBe('Admin LR JPRD');
    expect($admin->email_verified_at)->not->toBeNull();
    expect(Hash::check('123', $admin->password))->toBeTrue();
});
