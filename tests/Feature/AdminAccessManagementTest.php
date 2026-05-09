<?php

use App\Models\Role;
use App\Models\User;

it('allows master admin to open access management page', function () {
    $user = User::factory()->masterAdmin()->create();

    $this->actingAs($user)
        ->get(route('admin.access.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/AccessManagement')
            ->where('auth.user.role.slug', 'master-admin'));
});

it('prevents non master admin from opening access management page', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('admin.access.index'))
        ->assertForbidden();
});

it('allows master admin to create a user with selected role', function () {
    $masterAdmin = User::factory()->masterAdmin()->create();

    $role = Role::query()->create([
        'name' => 'Operator Laporan',
        'slug' => 'operator-laporan',
        'access_modules' => ['dashboard', 'laporan'],
    ]);

    $this->actingAs($masterAdmin)
        ->post(route('admin.access.users.store'), [
            'name' => 'Siti Tester',
            'email' => 'siti@example.com',
            'password' => 'rahsia123',
            'password_confirmation' => 'rahsia123',
            'role_id' => $role->id,
        ])
        ->assertRedirect(route('admin.access.index'));

    $this->assertDatabaseHas('users', [
        'name' => 'Siti Tester',
        'email' => 'siti@example.com',
        'role_id' => $role->id,
    ]);
});

it('allows master admin to update role module access', function () {
    $masterAdmin = User::factory()->masterAdmin()->create();

    $role = Role::query()->create([
        'name' => 'Pentadbir',
        'slug' => 'pentadbir',
        'access_modules' => ['dashboard'],
    ]);

    $this->actingAs($masterAdmin)
        ->put(route('admin.access.roles.update', $role), [
            'name' => 'Pentadbir',
            'access_modules' => ['dashboard', 'laporan', 'carian-pemilih'],
        ])
        ->assertRedirect(route('admin.access.index'));

    expect($role->fresh()->access_modules)->toBe([
        'dashboard',
        'laporan',
        'carian-pemilih',
    ]);
});

it('blocks access to module routes when user role does not have permission', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('laporan.index'))
        ->assertForbidden();
});
