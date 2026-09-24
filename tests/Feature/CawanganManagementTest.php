<?php

use App\Models\Cawangan;
use App\Models\CommitteeMembership;
use App\Models\CommitteePosition;
use App\Models\PemilihRecord;
use App\Models\User;

function cawanganVoter(array $attributes = []): PemilihRecord
{
    return PemilihRecord::query()->create(array_merge([
        'identity_number' => fake()->unique()->numerify('############'),
        'no_kp' => fake()->unique()->numerify('############'),
        'name' => 'PEMILIH CAWANGAN',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI LAMA',
        'status' => 'aktif',
    ], $attributes));
}

it('renders cawangan management with UDM options', function () {
    $user = User::factory()->withModules(['dashboard', 'cawangan'])->create();
    cawanganVoter();

    $this->actingAs($user)
        ->get(route('admin.cawangan.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Cawangan')
            ->where('udms', ['UDM ALPHA'])
            ->where('cawangans', [])
            ->where('legacy_scopes', []));
});

it('allows an authorized user to create, update, and delete a cawangan', function () {
    $user = User::factory()->withModules(['dashboard', 'cawangan'])->create();
    cawanganVoter(['dm' => 'UDM ALPHA']);

    $this->actingAs($user)
        ->post(route('admin.cawangan.store'), [
            'name' => 'Cawangan Taman Murni',
            'udm' => 'UDM ALPHA',
        ])
        ->assertRedirect(route('admin.cawangan.index'));

    $cawangan = Cawangan::query()->firstOrFail();
    $this->assertDatabaseHas('cawangans', [
        'id' => $cawangan->id,
        'name' => 'Cawangan Taman Murni',
        'udm' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->put(route('admin.cawangan.update', $cawangan), [
            'name' => 'Cawangan Taman Baru',
            'udm' => 'UDM ALPHA',
        ])
        ->assertRedirect(route('admin.cawangan.index'));

    expect($cawangan->fresh()->name)->toBe('Cawangan Taman Baru');

    $this->actingAs($user)
        ->delete(route('admin.cawangan.destroy', $cawangan))
        ->assertRedirect(route('admin.cawangan.index'));

    $this->assertDatabaseMissing('cawangans', ['id' => $cawangan->id]);
});

it('moves legacy locality memberships to the selected cawangan during repair', function () {
    $user = User::factory()->withModules(['dashboard', 'cawangan'])->create([
        'access_level' => 'cawangan',
        'scope_key' => 'UDM ALPHA|LOKALITI LAMA',
    ]);
    $voter = cawanganVoter();
    $position = CommitteePosition::query()->create([
        'name' => 'AJK',
        'slug' => 'ajk',
        'sort_order' => 1,
    ]);
    $cawangan = Cawangan::query()->create([
        'name' => 'Cawangan Taman Murni',
        'udm' => 'UDM ALPHA',
    ]);
    $membership = CommitteeMembership::query()->create([
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'cawangan',
        'scope_key' => 'UDM ALPHA|LOKALITI LAMA',
        'scope_name' => 'LOKALITI LAMA',
        'parent_scope_name' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->get(route('admin.cawangan.index'))
        ->assertInertia(fn ($page) => $page
            ->where('legacy_scopes.0.key', 'UDM ALPHA|LOKALITI LAMA')
            ->where('legacy_scopes.0.members_count', 1));

    $this->actingAs($user)
        ->post(route('admin.cawangan.repair'), [
            'repairs' => [[
                'legacy_scope_key' => 'UDM ALPHA|LOKALITI LAMA',
                'cawangan_id' => $cawangan->id,
            ]],
        ])
        ->assertRedirect(route('admin.cawangan.index'));

    $this->assertDatabaseHas('committee_memberships', [
        'id' => $membership->id,
        'cawangan_id' => $cawangan->id,
        'scope_key' => (string) $cawangan->id,
        'scope_name' => 'Cawangan Taman Murni',
        'parent_scope_name' => 'UDM ALPHA',
    ]);
    expect($user->fresh()->scope_key)->toBe((string) $cawangan->id);
});

it('uses registered cawangan scopes for new committee memberships', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $voter = cawanganVoter();
    $position = CommitteePosition::query()->create([
        'name' => 'AJK',
        'slug' => 'ajk',
        'sort_order' => 1,
    ]);
    $cawangan = Cawangan::query()->create([
        'name' => 'Cawangan Taman Murni',
        'udm' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.memberships.store'), [
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'cawangan',
            'scope_key' => (string) $cawangan->id,
        ])
        ->assertRedirect(route('jawatankuasa.index'));

    $this->assertDatabaseHas('committee_memberships', [
        'pemilih_record_id' => $voter->id,
        'cawangan_id' => $cawangan->id,
        'scope_key' => (string) $cawangan->id,
        'scope_name' => 'Cawangan Taman Murni',
        'parent_scope_name' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->get(route('jawatankuasa.index'))
        ->assertInertia(fn ($page) => $page
            ->where('scopes.cawangan.0.key', (string) $cawangan->id)
            ->where('scopes.cawangan.0.name', 'Cawangan Taman Murni')
            ->where('scopes.cawangan.0.parent_scope_name', 'UDM ALPHA'));
});

it('limits cawangan voter search to the selected cawangan UDM', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $matchingVoter = cawanganVoter([
        'name' => 'PEMILIH CARI UDM ALPHA',
        'dm' => 'UDM ALPHA',
    ]);
    $otherVoter = cawanganVoter([
        'name' => 'PEMILIH CARI UDM BETA',
        'dm' => 'UDM BETA',
    ]);
    $cawangan = Cawangan::query()->create([
        'name' => 'Cawangan Taman Murni',
        'udm' => 'UDM ALPHA',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('jawatankuasa.search', [
            'q' => 'PEMILIH CARI',
            'level' => 'cawangan',
            'scope_key' => (string) $cawangan->id,
        ]));

    $suggestionIds = collect($response->json('suggestions'))->pluck('id');

    $response->assertOk();
    expect($suggestionIds)
        ->toContain($matchingVoter->id)
        ->not->toContain($otherVoter->id);
});

it('limits a cawangan user to the registered branch scope', function () {
    $voter = cawanganVoter();
    $position = CommitteePosition::query()->create([
        'name' => 'Ketua Cawangan',
        'slug' => 'ketua-cawangan',
        'sort_order' => 2,
    ]);
    $ownCawangan = Cawangan::query()->create([
        'name' => 'Cawangan Sendiri',
        'udm' => 'UDM ALPHA',
    ]);
    $otherCawangan = Cawangan::query()->create([
        'name' => 'Cawangan Lain',
        'udm' => 'UDM ALPHA',
    ]);
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create([
        'access_level' => 'cawangan',
        'scope_key' => (string) $ownCawangan->id,
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.memberships.store'), [
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'cawangan',
            'scope_key' => (string) $otherCawangan->id,
        ])
        ->assertSessionHasErrors('scope_key');

    $this->actingAs($user)
        ->post(route('jawatankuasa.memberships.store'), [
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'cawangan',
            'scope_key' => (string) $ownCawangan->id,
        ])
        ->assertRedirect(route('jawatankuasa.index'));

    $this->actingAs($user)
        ->get(route('jawatankuasa.index'))
        ->assertInertia(fn ($page) => $page
            ->where('scopes.cawangan', [[
                'key' => (string) $ownCawangan->id,
                'name' => 'Cawangan Sendiri',
                'parent_scope_name' => 'UDM ALPHA',
                'cawangan_id' => $ownCawangan->id,
            ]])
            ->where('memberships.0.cawangan_id', $ownCawangan->id));
});
