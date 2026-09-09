<?php

use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('creates the admin user from the configured initial password', function () {
    config()->set('app.admin_initial_password', 'temporary-test-password');

    $this->seed(AdminUserSeeder::class);

    $admin = User::query()->where('email', 'admin@jprd')->first();

    expect($admin)->not->toBeNull();
    expect($admin->name)->toBe('Admin PAS SIK');
    expect($admin->email_verified_at)->not->toBeNull();
    expect(Hash::check('temporary-test-password', $admin->password))->toBeTrue();
    expect($admin->must_change_password)->toBeTrue();
});
