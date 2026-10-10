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
