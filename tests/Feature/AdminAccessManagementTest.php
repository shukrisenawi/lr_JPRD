<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('allows master admin to open access management page', function () {
    $user = User::factory()->masterAdmin()->create();
    $managedUser = User::factory()->create([
        'name' => 'AAA User Bergambar',
        'avatar' => 'avatars/user-bergambar.jpg',
    ]);

    $this->actingAs($user)
        ->get(route('admin.access.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/AccessManagement')
            ->where('auth.user.role.slug', 'master-admin')
            ->where('modules', fn ($modules) => collect($modules)->contains(fn ($module) => $module['key'] === 'ahli-pas' && $module['label'] === 'Ahli PAS'))
            ->where('modules', fn ($modules) => collect($modules)->contains(fn ($module) => $module['key'] === 'spokas' && $module['label'] === 'SPoKAS'))
            ->where('users.0.id', $managedUser->id)
            ->where('users.0.avatar_url', $managedUser->avatarUrl()));
});

it('prevents non master admin from opening access management page', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('admin.access.index'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
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
            'access_modules' => ['dashboard', 'laporan', 'carian-pemilih', 'ahli-pas', 'hashtag-pemilih', 'spokas'],
        ])
        ->assertRedirect(route('admin.access.index'));

    expect($role->fresh()->access_modules)->toBe([
        'dashboard',
        'laporan',
        'carian-pemilih',
        'ahli-pas',
        'hashtag-pemilih',
        'spokas',
    ]);
});

it('blocks access to module routes when user role does not have permission', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('laporan.index'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

it('logs out user and redirects to login when forbidden page is accessed', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('laporan.index'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

it('allows master admin to update existing user details', function () {
    $masterAdmin = User::factory()->masterAdmin()->create();
    $user = User::factory()->create([
        'name' => 'Nama Lama',
        'email' => 'lama@example.com',
    ]);
    $role = Role::factory()->create([
        'name' => 'Editor',
        'slug' => 'editor',
    ]);

    $this->actingAs($masterAdmin)
        ->put(route('admin.access.users.update', $user), [
            'name' => 'Nama Baru',
            'email' => 'baru@example.com',
            'role_id' => $role->id,
            'password' => '',
            'password_confirmation' => '',
        ])
        ->assertRedirect(route('admin.access.index'));

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Nama Baru',
        'email' => 'baru@example.com',
        'role_id' => $role->id,
    ]);
});

it('allows master admin to delete existing user and avatar file', function () {
    Storage::fake('public');

    $masterAdmin = User::factory()->masterAdmin()->create();
    $user = User::factory()->create([
        'avatar' => 'avatars/untuk-padam.jpg',
    ]);

    Storage::disk('public')->put(
        'avatars/untuk-padam.jpg',
        UploadedFile::fake()->create('untuk-padam.jpg', 10)->get()
    );

    $this->actingAs($masterAdmin)
        ->delete(route('admin.access.users.destroy', $user))
        ->assertRedirect(route('admin.access.index'));

    $this->assertDatabaseMissing('users', [
        'id' => $user->id,
    ]);

    Storage::disk('public')->assertMissing('avatars/untuk-padam.jpg');
});

it('prevents master admin from deleting own account', function () {
    $masterAdmin = User::factory()->masterAdmin()->create();

    $this->actingAs($masterAdmin)
        ->delete(route('admin.access.users.destroy', $masterAdmin))
        ->assertRedirect(route('admin.access.index'));

    $this->assertDatabaseHas('users', [
        'id' => $masterAdmin->id,
        'email' => $masterAdmin->email,
    ]);
});

it('allows master admin to impersonate another user and keeps return session', function () {
    $masterAdmin = User::factory()->masterAdmin()->create();
    $targetUser = User::factory()->withModules(['dashboard', 'laporan'])->create();

    $this->actingAs($masterAdmin)
        ->post(route('admin.access.users.impersonate', $targetUser))
        ->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($targetUser);
    expect(session('impersonator_id'))->toBe($masterAdmin->id);
});

it('allows impersonated user session to return to original master admin', function () {
    $masterAdmin = User::factory()->masterAdmin()->create();
    $targetUser = User::factory()->withModules(['dashboard', 'laporan'])->create();

    $this->actingAs($masterAdmin)
        ->withSession(['impersonator_id' => $masterAdmin->id])
        ->be($targetUser)
        ->post(route('admin.access.impersonation.destroy'))
        ->assertRedirect(route('admin.access.index'));

    $this->assertAuthenticatedAs($masterAdmin);
    expect(session()->has('impersonator_id'))->toBeFalse();
});

it('restores master admin access to module routes after stopping impersonation', function () {
    $masterAdmin = User::factory()->masterAdmin()->create();
    $targetUser = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($masterAdmin)
        ->post(route('admin.access.users.impersonate', $targetUser))
        ->assertRedirect(route('dashboard'));

    $this->post(route('admin.access.impersonation.destroy'))
        ->assertRedirect(route('admin.access.index'));

    $this->get(route('dashboard'))->assertOk();
    $this->get(route('laporan.index'))->assertOk();
    $this->get(route('program.index'))->assertOk();
});
