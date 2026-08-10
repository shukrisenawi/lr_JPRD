<?php

use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Support\Str;

function createAhliPasRecord(array $attributes): PemilihRecord
{
    return PemilihRecord::create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'status' => 'aktif',
        'is_manual' => false,
    ], $attributes));
}

it('renders ahli pas list and statistics using only records with no ahli', function () {
    $user = User::factory()->withModules(['ahli-pas'])->create();

    createAhliPasRecord([
        'name' => 'AHLI SATU',
        'no_ahli' => 'PAS-001',
        'dm' => 'UDM A',
        'locality' => 'LOKALITI A',
    ]);
    createAhliPasRecord([
        'name' => 'BUKAN AHLI',
        'no_ahli' => null,
        'dm' => 'UDM A',
        'locality' => 'LOKALITI A',
    ]);
    createAhliPasRecord([
        'name' => 'AHLI TIDAK AKTIF',
        'no_ahli' => 'PAS-002',
        'dm' => 'UDM B',
        'locality' => 'LOKALITI B',
        'status' => 'xaktif',
    ]);

    $this->actingAs($user)
        ->get('/ahli-pas')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('AhliPas/Index')
            ->where('active_tab', 'senarai')
            ->where('members.total', 1)
            ->where('members.data.0.name', 'AHLI SATU')
            ->where('statistics.total', 1)
            ->where('statistics.by_udm.0.udm', 'UDM A')
            ->where('statistics.by_udm.0.total', 1)
            ->where('statistics.by_locality.0.locality', 'LOKALITI A'));

    $this->actingAs($user)
        ->get('/ahli-pas?tab=statistik')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('AhliPas/Index')
            ->where('active_tab', 'statistik'));
});

it('applies the users locality scope to ahli pas', function () {
    $user = User::factory()->withModules(['ahli-pas'])->create([
        'access_level' => 'cawangan',
        'scope_key' => 'UDM A|LOKALITI A',
    ]);

    createAhliPasRecord(['name' => 'DALAM SKOP', 'no_ahli' => 'PAS-001', 'dm' => 'UDM A', 'locality' => 'LOKALITI A']);
    createAhliPasRecord(['name' => 'LUAR SKOP', 'no_ahli' => 'PAS-002', 'dm' => 'UDM A', 'locality' => 'LOKALITI B']);

    $this->actingAs($user)
        ->get('/ahli-pas')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('members.total', 1)
            ->where('members.data.0.name', 'DALAM SKOP')
            ->where('statistics.total', 1));
});

it('requires the ahli pas role permission', function () {
    $user = User::factory()->withModules(['carian-pemilih'])->create();

    $this->actingAs($user)
        ->get('/ahli-pas')
        ->assertRedirect('/');

    $this->assertAuthenticatedAs($user);
});
