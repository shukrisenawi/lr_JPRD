<?php

use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Str;

function createPlkRecord(array $attributes = []): PemilihRecord
{
    return PemilihRecord::query()->create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'name' => 'PEMILIH PLK',
        'no_kp' => '900101011234',
        'dm' => 'UDM A',
        'locality' => 'LOKALITI A',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => '3B',
    ], $attributes));
}

it('lists only active PLK voters and separates voters already verified', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $pending = createPlkRecord(['name' => 'BELUM SEMAK']);
    $checked = createPlkRecord([
        'name' => 'SUDAH SEMAK',
        'cula_code' => '3U',
        'plk_verified_at' => now(),
        'plk_verified_by' => $user->id,
    ]);
    createPlkRecord(['name' => 'BUKAN KOD PLK', 'cula_code' => '2']);
    createPlkRecord(['name' => 'TIDAK AKTIF', 'cula_code' => '3D', 'status' => 'xaktif']);

    $this->actingAs($user)
        ->get(route('plk.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Plk/Index')
            ->where('active_tab', 'senarai')
            ->where('summary.total', 2)
            ->where('summary.pending', 1)
            ->where('summary.checked', 1)
            ->where('code_counts.3B', 1)
            ->where('code_counts.3U', 1)
            ->where('voters.total', 2)
            ->where('voters.data.0.id', $pending->id)
            ->where('voters.data.0.cula_code', '3B'));

    $this->actingAs($user)
        ->get(route('plk.index', ['cula_code' => '3U']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.cula_code', '3U')
            ->where('voters.total', 1)
            ->where('voters.data.0.id', $checked->id));

    $this->actingAs($user)
        ->get(route('plk.index', ['tab' => 'disemak']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('active_tab', 'disemak')
            ->where('voters.total', 1)
            ->where('voters.data.0.id', $checked->id)
            ->where('voters.data.0.verified_by', $user->name));
});

it('marks a PLK voter as verified by the current user', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord();

    $this->actingAs($user)
        ->post(route('plk.verify', $voter))
        ->assertRedirect();

    $this->assertDatabaseHas('pemilih_records', [
        'id' => $voter->id,
        'plk_verified_by' => $user->id,
    ]);
    expect($voter->fresh()->plk_verified_at)->not->toBeNull();
});

it('updates PLK tab badge counts to match the selected UDM', function () {
    $user = User::factory()->withModules(['plk'])->create();
    createPlkRecord(['identity_number' => 'PLK-UDM-A-1', 'dm' => 'UDM A', 'cula_code' => '3B']);
    createPlkRecord(['identity_number' => 'PLK-UDM-A-2', 'dm' => 'UDM A', 'cula_code' => '3B']);
    createPlkRecord(['identity_number' => 'PLK-UDM-A-3', 'dm' => 'UDM A', 'cula_code' => '3D']);
    createPlkRecord(['identity_number' => 'PLK-UDM-B-1', 'dm' => 'UDM B', 'cula_code' => '3D']);

    $this->actingAs($user)
        ->get(route('plk.index', ['udm' => 'UDM A']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.udm', 'UDM A')
            ->where('summary.total', 3)
            ->where('summary.pending', 3)
            ->where('code_counts.3B', 2)
            ->where('code_counts.3D', 1)
            ->where('code_counts.3U', 0)
            ->where('voters.total', 3));
});

it('limits PLK lists and verification actions to the users pemilih scope', function () {
    $user = User::factory()->withModules(['plk'])->create([
        'access_level' => 'cawangan',
        'scope_key' => 'UDM A|LOKALITI A',
    ]);
    $inScope = createPlkRecord(['name' => 'DALAM SKOP']);
    $outsideScope = createPlkRecord(['name' => 'LUAR SKOP', 'locality' => 'LOKALITI B']);

    $this->actingAs($user)
        ->get(route('plk.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 1)
            ->where('voters.total', 1)
            ->where('voters.data.0.id', $inScope->id));

    $this->actingAs($user)
        ->postJson(route('plk.verify', $outsideScope))
        ->assertForbidden();
});

it('saves per-code rates and calculates totals by UDM', function () {
    $user = User::factory()->withModules(['plk'])->create();
    createPlkRecord(['identity_number' => 'PLK-A-1', 'dm' => 'UDM A', 'cula_code' => '3B']);
    createPlkRecord(['identity_number' => 'PLK-A-2', 'dm' => 'UDM A', 'cula_code' => '3B']);
    createPlkRecord(['identity_number' => 'PLK-A-3', 'dm' => 'UDM A', 'cula_code' => '3D']);
    createPlkRecord(['identity_number' => 'PLK-B-1', 'dm' => 'UDM B', 'cula_code' => '3U']);

    $rates = ['3B' => 10, '3D' => 5.5, '3K' => 0, '3M' => 0, '3P' => 0, '3U' => 20];
    $this->actingAs($user)
        ->put(route('plk.rates.update'), ['rates' => $rates])
        ->assertRedirect();

    $this->assertSame($rates, json_decode((string) Setting::valueOf('plk_rates'), true));

    $this->actingAs($user)
        ->get(route('plk.index', ['tab' => 'kos']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('rates.3B', 10)
            ->where('cost_rows', function ($rows) {
                $byUdm = collect($rows)->keyBy('udm');

                return $byUdm->get('UDM A')['counts']['3B'] == 2
                    && $byUdm->get('UDM A')['amounts']['3B'] == 20
                    && $byUdm->get('UDM A')['total'] == 25.5
                    && $byUdm->get('UDM B')['total'] == 20;
            }));
});
