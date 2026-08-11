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
            ->where('members.per_page', 20)
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

it('lists ahli pas with non pas and missing cula codes', function () {
    $user = User::factory()->withModules(['ahli-pas'])->create();

    createAhliPasRecord(['name' => 'BELUM CULA', 'no_ahli' => 'PAS-001', 'cula_code' => null]);
    createAhliPasRecord(['name' => 'CULA UMNO', 'no_ahli' => 'PAS-002', 'dm' => 'UDM A', 'cula_code' => '1']);
    createAhliPasRecord(['name' => 'PAS DALAM KAWASAN', 'no_ahli' => 'PAS-003', 'cula_code' => '2']);
    createAhliPasRecord(['name' => 'PAS LUAR PARLIMEN', 'no_ahli' => 'PAS-004', 'cula_code' => '3P']);
    createAhliPasRecord(['name' => 'AHLI MATI', 'no_ahli' => 'PAS-005', 'cula_code' => '8']);

    $this->actingAs($user)
        ->get('/ahli-pas?tab=salah-cula')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('AhliPas/Index')
            ->where('active_tab', 'salah-cula')
            ->where('wrong_cula_members.per_page', 20)
            ->where('wrong_cula_members.total', 2)
            ->where('wrong_cula_members.data.0.name', 'BELUM CULA')
            ->where('wrong_cula_members.data.1.name', 'CULA UMNO'));

    $this->actingAs($user)
        ->get('/ahli-pas?tab=salah-cula&udm=UDM%20A&q=UMNO')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('wrong_cula_members.total', 1)
            ->where('wrong_cula_members.data.0.name', 'CULA UMNO'));
});

it('shares the wrong cula ahli pas count for the navigation badge', function () {
    $user = User::factory()->withModules(['ahli-pas'])->create([
        'access_level' => 'cawangan',
        'scope_key' => 'UDM A|LOKALITI A',
    ]);

    createAhliPasRecord(['name' => 'BELUM CULA', 'no_ahli' => 'PAS-001', 'dm' => 'UDM A', 'locality' => 'LOKALITI A', 'cula_code' => null]);
    createAhliPasRecord(['name' => 'CULA BUKAN PAS', 'no_ahli' => 'PAS-002', 'dm' => 'UDM A', 'locality' => 'LOKALITI A', 'cula_code' => '1']);
    createAhliPasRecord(['name' => 'CULA PAS', 'no_ahli' => 'PAS-003', 'dm' => 'UDM A', 'locality' => 'LOKALITI A', 'cula_code' => '2']);
    createAhliPasRecord(['name' => 'LUAR SKOP', 'no_ahli' => 'PAS-004', 'dm' => 'UDM A', 'locality' => 'LOKALITI B', 'cula_code' => '1']);
    createAhliPasRecord(['name' => 'AHLI MATI', 'no_ahli' => 'PAS-005', 'dm' => 'UDM A', 'locality' => 'LOKALITI A', 'cula_code' => '8']);

    $this->actingAs($user)
        ->get('/ahli-pas')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('badgeCounts.ahliPasSalahCula', 2));
});

it('requires the ahli pas role permission', function () {
    $user = User::factory()->withModules(['carian-pemilih'])->create();

    $this->actingAs($user)
        ->get('/ahli-pas')
        ->assertRedirect('/');

    $this->assertAuthenticatedAs($user);
});

it('updates salah cula member to an allowed pas cula code within the user scope', function () {
    $user = User::factory()->withModules(['ahli-pas'])->create([
        'access_level' => 'cawangan',
        'scope_key' => 'UDM A|LOKALITI A',
    ]);
    $member = createAhliPasRecord([
        'no_ahli' => 'PAS-001',
        'dm' => 'UDM A',
        'locality' => 'LOKALITI A',
        'cula_code' => '1',
        'cula_display_label' => '1 - UMNO',
    ]);

    $this->actingAs($user)
        ->postJson(route('ahli-pas.cula.update', $member), [
            'cula_code' => '2',
            'cula_display_label' => '2 - PAS',
        ])
        ->assertOk()
        ->assertJsonPath('voter_id', $member->id);

    $this->assertDatabaseHas('pemilih_records', [
        'id' => $member->id,
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
    ]);
    $this->assertDatabaseHas('cula_work_items', [
        'pemilih_record_id' => $member->id,
        'marked_by' => $user->id,
    ]);
});
