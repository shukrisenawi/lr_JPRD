<?php

use App\Models\KadTen;
use App\Models\PemilihRecord;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

// Tugasan individu telah digantikan oleh keluarga; lihat KkrTenTest untuk agihan baharu.
it('allows a scoped UDM to create KKR10 with any active voter as leader', function () {
    $user = User::factory()->withModules(['kad-ten'])->create(['access_level' => 'udm', 'scope_key' => 'UDM ALPHA']);
    $leader = PemilihRecord::query()->create([
        'identity_number' => '900101025001', 'name' => 'KETUA ALPHA', 'dm' => 'UDM ALPHA',
        'locality' => 'LOCALITY', 'status' => 'aktif', 'is_manual' => false,
    ]);
    $this->actingAs($user)->post(route('kad-ten.store'), [
        'pemimpin_id' => $leader->id, 'level' => 'udm',
    ])->assertSessionHasNoErrors()->assertRedirect(route('kad-ten.index'));
    expect(KadTen::query()->where('pemimpin_id', $leader->id)->count())->toBe(1);
    $this->post(route('kad-ten.store'), [
        'pemimpin_id' => $leader->id, 'level' => 'udm',
    ])->assertSessionHasErrors('pemimpin_id');
    $outside = PemilihRecord::query()->create([
        'identity_number' => '900101025002', 'name' => 'KETUA BETA', 'dm' => 'UDM BETA',
        'locality' => 'OTHER', 'status' => 'aktif', 'is_manual' => false,
    ]);
    $this->post(route('kad-ten.store'), [
        'pemimpin_id' => $outside->id, 'level' => 'udm',
    ])->assertSessionHasErrors('pemimpin_id');
});

it('suggests non-committee voters as scoped KKR10 leaders', function () {
    $user = User::factory()->withModules(['kad-ten'])->create(['access_level' => 'udm', 'scope_key' => 'UDM ALPHA']);
    PemilihRecord::query()->create([
        'identity_number' => '900101025003', 'name' => 'KETUA ALPHA', 'dm' => 'UDM ALPHA',
        'locality' => 'LOCALITY', 'status' => 'aktif', 'is_manual' => false,
    ]);
    $this->actingAs($user)->getJson(route('kad-ten.suggest-pemimpin', ['q' => 'KETUA']))
        ->assertOk()->assertJsonCount(1, 'suggestions')->assertJsonPath('suggestions.0.name', 'KETUA ALPHA');
});

it('paginates KKR10 leaders at twenty per page', function () {
    $user = User::factory()->masterAdmin()->create();
    for ($i = 0; $i < 21; $i++) {
        $leader = PemilihRecord::query()->create([
            'identity_number' => 'KKRPAGE'.$i, 'name' => 'LEADER '.$i,
            'dm' => 'UDM ALPHA', 'status' => 'aktif', 'is_manual' => false,
        ]);
        KadTen::query()->create(['pemimpin_id' => $leader->id, 'level' => 'udm', 'scope_key' => 'UDM ALPHA']);
    }
    $this->actingAs($user)->get(route('kad-ten.index'))->assertInertia(fn (Assert $page) => $page
        ->component('KadTen/KkrIndex')->has('kads.data', 20)->where('kads.total', 21));
});
