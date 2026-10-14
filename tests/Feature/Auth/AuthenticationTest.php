<?php

use App\Models\User;

test('login screen can be rendered', function () {
    config()->set('app.env', 'local');
    config()->set('database.connections.mysql.username', 'root');

    $response = $this->get('/login');

    $response->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('Auth/Login')
            ->missing('defaultCredentials'));
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->withModules(['dashboard', 'laporan'])->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('laporan.index', absolute: false));
});

test('master admins are redirected to the laporan page after login', function () {
    $user = User::factory()->masterAdmin()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('laporan.index', absolute: false));
});

test('users can authenticate with a case-insensitive email address', function () {
    $user = User::factory()->withModules(['dashboard'])->create([
        'email' => 'nama.pengguna@example.com',
    ]);

    $response = $this->post('/login', [
        'email' => 'NAMA.PENGGUNA@EXAMPLE.COM',
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users are redirected to their first accessible navbar menu after login', function () {
    $user = User::factory()->withModules(['dashboard', 'laporan', 'carian-pemilih', 'program'])->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('laporan.index', absolute: false));
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});

test('UDM users land on their dashboard regardless of an intended URL', function () {
    $user = User::factory()->withModules(['dashboard-udm', 'laporan'])->create(['access_level' => 'udm']);
    $this->withSession(['url.intended' => route('laporan.index')])->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertRedirect(route('dashboard-udm', absolute: false));
    $this->assertAuthenticatedAs($user);
});

test('UDM users using the default password must change it before opening the dashboard', function () {
    $user = User::factory()->withModules(['dashboard-udm'])->create([
        'access_level' => 'udm', 'password' => '123', 'must_change_password' => false,
    ]);
    $this->post('/login', ['email' => $user->email, 'password' => '123'])
        ->assertRedirect(route('profile.edit', absolute: false));
    expect($user->fresh()->must_change_password)->toBeTrue();
    $this->get(route('dashboard-udm'))->assertRedirect(route('profile.edit'));
});

test('UDM users flagged for a password change land on their profile', function () {
    $user = User::factory()->withModules(['dashboard-udm'])->create([
        'access_level' => 'udm', 'must_change_password' => true,
    ]);
    $this->post('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertRedirect(route('profile.edit', absolute: false));
});
