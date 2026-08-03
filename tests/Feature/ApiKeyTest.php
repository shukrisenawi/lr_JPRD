<?php

use App\Models\ApiKey;
use App\Models\PemilihRecord;
use App\Models\User;
use Carbon\Carbon;

it('allows a master admin to generate an API key', function () {
    $admin = User::factory()->masterAdmin()->create();

    $response = $this->actingAs($admin)->post(route('admin.api-keys.store'), [
        'name' => 'Birthday App',
        'expires_at' => now()->addYear()->toDateString(),
    ]);

    $response->assertRedirect(route('admin.api-keys.index'));

    $plainTextKey = session('new_api_key');
    $apiKey = ApiKey::query()->latest('id')->first();

    if (! is_string($plainTextKey)) {
        throw new RuntimeException('API key tidak dijumpai dalam flash session.');
    }

    expect(strlen($plainTextKey))->toBe(40);
    expect($apiKey)->not->toBeNull();
    expect($apiKey->key)->toBe($plainTextKey);
    $this->assertDatabaseHas('api_keys', ['name' => 'Birthday App']);
});

it('serves birthday voter data to an external app with a bearer API key', function () {
    $plainTextKey = 'birthday-app-secret-key';
    $birthday = Carbon::today('Asia/Kuala_Lumpur')->subYears(30);

    ApiKey::query()->create([
        'name' => 'Birthday App',
        'key' => $plainTextKey,
    ]);

    PemilihRecord::query()->create([
        'identity_number' => '900101010101',
        'no_kp' => '900101010101',
        'name' => 'Ahmad Tester',
        'date_of_birth' => $birthday,
        'phone_mobile' => '012-345 6789',
        'status' => 'aktif',
        'is_manual' => false,
    ]);

    $response = $this->getJson(route('api.voters.birthdays', [
        'date' => $birthday->toDateString(),
    ]), [
        'Authorization' => 'Bearer '.$plainTextKey,
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('data.0.name', 'Ahmad Tester')
        ->assertJsonPath('data.0.no_telefon', '0123456789');

    expect(ApiKey::query()->first()->last_used_at)->not->toBeNull();
});

it('rejects invalid and expired API keys', function () {
    $birthday = Carbon::today('Asia/Kuala_Lumpur');

    $this->getJson(route('api.voters.birthdays', ['date' => $birthday->toDateString()]), [
        'Authorization' => 'Bearer invalid-key',
    ])
        ->assertUnauthorized()
        ->assertJsonPath('error', 'Kunci API tidak sah.');

    ApiKey::query()->create([
        'name' => 'Expired App',
        'key' => 'expired-key',
        'expires_at' => now()->subMinute(),
    ]);

    $this->getJson(route('api.voters.birthdays', ['date' => $birthday->toDateString()]), [
        'Authorization' => 'Bearer expired-key',
    ])
        ->assertUnauthorized()
        ->assertJsonPath('error', 'Kunci API telah luput.');
});
