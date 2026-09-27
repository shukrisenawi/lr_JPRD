<?php

use App\Models\Cawangan;
use App\Models\Kenderaan;
use App\Models\PemilihRecord;
use App\Models\User;

function kenderaanVoter(string $udm): PemilihRecord
{
    return PemilihRecord::query()->create([
        'identity_number' => fake()->unique()->numerify('############'),
        'no_kp' => fake()->unique()->numerify('############'),
        'name' => 'PEMILIH KENDERAAN',
        'dm' => $udm,
        'status' => 'aktif',
    ]);
}

it('renders the vehicle page with UDM cards and counts', function () {
    $user = User::factory()->withModules(['dashboard', 'kenderaan'])->create();
    kenderaanVoter('UDM ALPHA');
    kenderaanVoter('UDM BETA');
    Kenderaan::query()->create([
        'udm' => 'UDM ALPHA',
        'no_plate' => 'KCA 1234',
        'jenis_kenderaan' => 'MPV',
    ]);
    Kenderaan::query()->create([
        'udm' => 'UDM ALPHA',
        'no_plate' => 'KCA 5678',
        'jenis_kenderaan' => 'Van',
    ]);

    $this->actingAs($user)
        ->get(route('kenderaan.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Kenderaan/Index')
            ->where('udms', ['UDM ALPHA', 'UDM BETA'])
            ->where('selectedUdm', '')
            ->where('canSelectAll', true)
            ->where('udmSummaries.0.udm', 'UDM ALPHA')
            ->where('udmSummaries.0.count', 2)
            ->where('udmSummaries.1.udm', 'UDM BETA')
            ->where('udmSummaries.1.count', 0));
});

it('allows an authorized user to create, update, and delete a vehicle', function () {
    $user = User::factory()->withModules(['dashboard', 'kenderaan'])->create();
    kenderaanVoter('UDM ALPHA');

    $this->actingAs($user)
        ->post(route('kenderaan.store'), [
            'udm' => 'UDM ALPHA',
            'no_plate' => 'kca 1234',
            'jenis_kenderaan' => 'MPV',
        ])
        ->assertRedirect(route('kenderaan.index'));

    $kenderaan = Kenderaan::query()->sole();
    expect($kenderaan->no_plate)->toBe('KCA 1234')
        ->and($kenderaan->jenis_kenderaan)->toBe('MPV');

    $this->actingAs($user)
        ->put(route('kenderaan.update', $kenderaan), [
            'udm' => 'UDM ALPHA',
            'no_plate' => 'KCA 4321',
            'jenis_kenderaan' => 'Van',
        ])
        ->assertRedirect(route('kenderaan.index'));

    expect($kenderaan->fresh()->no_plate)->toBe('KCA 4321')
        ->and($kenderaan->fresh()->jenis_kenderaan)->toBe('Van');

    $this->actingAs($user)
        ->delete(route('kenderaan.destroy', $kenderaan))
        ->assertRedirect(route('kenderaan.index'));

    $this->assertDatabaseMissing('kenderaan', ['id' => $kenderaan->id]);
});

it('requires the vehicle module before opening the vehicle page', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('kenderaan.index'))
        ->assertRedirect(route('profile.edit', absolute: false));
});

it('limits UDM users to their own vehicle scope', function () {
    kenderaanVoter('UDM ALPHA');
    kenderaanVoter('UDM BETA');
    $alphaVehicle = Kenderaan::query()->create([
        'udm' => 'UDM ALPHA',
        'no_plate' => 'KCA 1111',
        'jenis_kenderaan' => 'Sedan',
    ]);
    $betaVehicle = Kenderaan::query()->create([
        'udm' => 'UDM BETA',
        'no_plate' => 'KBA 2222',
        'jenis_kenderaan' => 'Van',
    ]);
    $user = User::factory()->withModules(['dashboard', 'kenderaan'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->get(route('kenderaan.index', ['udm' => 'UDM BETA']))
        ->assertInertia(fn ($page) => $page
            ->where('udms', ['UDM ALPHA'])
            ->where('selectedUdm', 'UDM ALPHA')
            ->where('canSelectAll', false)
            ->where('vehicles', fn ($vehicles) => collect($vehicles)->pluck('id')->all() === [$alphaVehicle->id]));

    $this->actingAs($user)
        ->post(route('kenderaan.store'), [
            'udm' => 'UDM BETA',
            'no_plate' => 'KBA 3333',
            'jenis_kenderaan' => '4x4',
        ])
        ->assertSessionHasErrors('udm');

    $this->actingAs($user)
        ->putJson(route('kenderaan.update', $betaVehicle), [
            'udm' => 'UDM BETA',
            'no_plate' => 'KBA 4444',
            'jenis_kenderaan' => '4x4',
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->deleteJson(route('kenderaan.destroy', $betaVehicle))
        ->assertForbidden();
});

it('limits cawangan users to the parent UDM', function () {
    kenderaanVoter('UDM ALPHA');
    kenderaanVoter('UDM BETA');
    $cawangan = Cawangan::query()->create([
        'name' => 'Cawangan Alpha',
        'udm' => 'UDM ALPHA',
    ]);
    Kenderaan::query()->create([
        'udm' => 'UDM ALPHA',
        'no_plate' => 'KCA 5555',
        'jenis_kenderaan' => 'MPV',
    ]);
    Kenderaan::query()->create([
        'udm' => 'UDM BETA',
        'no_plate' => 'KBA 6666',
        'jenis_kenderaan' => 'Sedan',
    ]);
    $user = User::factory()->withModules(['dashboard', 'kenderaan'])->create([
        'access_level' => 'cawangan',
        'scope_key' => (string) $cawangan->id,
    ]);

    $this->actingAs($user)
        ->get(route('kenderaan.index'))
        ->assertInertia(fn ($page) => $page
            ->where('udms', ['UDM ALPHA'])
            ->where('vehicles', fn ($vehicles) => collect($vehicles)->pluck('udm')->unique()->values()->all() === ['UDM ALPHA']));
});
