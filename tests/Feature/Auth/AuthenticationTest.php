<?php

use App\Models\User;

test('login screen can be rendered', function () {
    config()->set('app.env', 'local');
    config()->set('database.connections.mysql.username', 'root');

    $response = $this->get('/login');

    $response->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('Auth/Login')
            ->where('defaultCredentials.email', 'admin@jprd')
            ->where('defaultCredentials.password', '123'));
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
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
