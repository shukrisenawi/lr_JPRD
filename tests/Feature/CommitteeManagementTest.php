<?php

use App\Models\CommitteeGroup;
use App\Models\CommitteeMembership;
use App\Models\CommitteePosition;
use App\Models\PemilihRecord;
use App\Models\User;

it('renders jawatankuasa page for authenticated user with module access', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();

    $this->actingAs($user)
        ->get(route('jawatankuasa.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Committee/Index')
            ->where('positions', [])
            ->where('memberships', [])
            ->where('scopes.jprd.0.key', 'jprd')
            ->where('scopes.jprd.0.name', 'JPRD')
            ->where('udm_statuses', []));
});

it('shows UDM group update status based on committee members', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $group = CommitteeGroup::query()->create([
        'name' => 'JAWATANKUASA UTAMA',
        'levels' => ['udm'],
        'sort_order' => 1,
    ]);
    $pacabaGroup = CommitteeGroup::query()->create([
        'name' => 'PASUKAN PACABA',
        'levels' => ['udm'],
        'sort_order' => 2,
    ]);
    $barongGroup = CommitteeGroup::query()->create([
        'name' => 'PETUGAS BARUNG',
        'levels' => ['udm'],
        'sort_order' => 3,
    ]);
    $position = CommitteePosition::query()->create([
        'name' => 'Pengerusi',
        'slug' => 'pengerusi',
        'sort_order' => 1,
    ]);
    $pacabaPosition = CommitteePosition::query()->create([
        'name' => 'AJK Pacaba',
        'slug' => 'ajk-pacaba',
        'sort_order' => 2,
    ]);
    $barongPosition = CommitteePosition::query()->create([
        'name' => 'AJK Barong',
        'slug' => 'ajk-barong',
        'sort_order' => 3,
    ]);
    $group->positions()->attach($position->id, [
        'level' => 'udm',
        'sort_order' => 0,
    ]);
    $pacabaGroup->positions()->attach($pacabaPosition->id, [
        'level' => 'udm',
        'sort_order' => 0,
    ]);
    $barongGroup->positions()->attach($barongPosition->id, [
        'level' => 'udm',
        'sort_order' => 0,
    ]);

    $updatedUdmVoter = PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'UDM ALPHA',
        'locality' => 'KG ALPHA',
        'status' => 'aktif',
    ]);
    PemilihRecord::query()->create([
        'identity_number' => '900202025555',
        'no_kp' => '900202025555',
        'name' => 'SITI BINTI ABU',
        'dm' => 'UDM BETA',
        'locality' => 'KG BETA',
        'status' => 'aktif',
    ]);

    CommitteeMembership::query()->create([
        'committee_group_id' => $group->id,
        'pemilih_record_id' => $updatedUdmVoter->id,
        'committee_position_id' => $position->id,
        'level' => 'udm',
        'scope_key' => 'UDM ALPHA',
        'scope_name' => 'UDM ALPHA',
    ]);
    CommitteeMembership::query()->create([
        'committee_group_id' => $pacabaGroup->id,
        'pemilih_record_id' => $updatedUdmVoter->id,
        'committee_position_id' => $pacabaPosition->id,
        'level' => 'udm',
        'scope_key' => 'UDM ALPHA',
        'scope_name' => 'UDM ALPHA',
    ]);
    CommitteeMembership::query()->create([
        'committee_group_id' => $barongGroup->id,
        'pemilih_record_id' => $updatedUdmVoter->id,
        'committee_position_id' => $barongPosition->id,
        'level' => 'udm',
        'scope_key' => 'UDM ALPHA',
        'scope_name' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->get(route('jawatankuasa.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('udm_statuses', [
                [
                    'key' => 'UDM ALPHA',
                    'name' => 'UDM ALPHA',
                    'members_count' => 3,
                    'has_members' => true,
                ],
                [
                    'key' => 'UDM BETA',
                    'name' => 'UDM BETA',
                    'members_count' => 0,
                    'has_members' => false,
                ],
            ])
            ->where('udm_n8n_message', fn ($message) => str_contains($message, '📌SENARAI JAWATANKUASA UDM JENERI ')
                && str_contains($message, '📌JAWATANKUASA UDM YANG SUDAH HANTAR')
                && str_contains($message, '1) UDM ALPHA')
                && ! str_contains($message, '1) UDM ALPHA 🌸🌸🌸🌸🌸')
                && ! str_contains($message, '   - JAWATANKUASA UDM ✅')
                && str_contains($message, '   - PACABA ✅')
                && str_contains($message, '   - BARONG ✅')
                && str_contains($message, '🌸Terima kasih atas komitmen UDM.. Ayuh kita Selesaikan.. Anda semua terbaik')));

    foreach (range(2, 10) as $number) {
        $voter = PemilihRecord::query()->create([
            'identity_number' => sprintf('900101%06d', $number),
            'no_kp' => sprintf('900101%06d', $number),
            'name' => 'UDM MEMBER '.$number,
            'dm' => 'UDM ALPHA',
            'locality' => 'KG ALPHA',
            'status' => 'aktif',
        ]);

        CommitteeMembership::query()->create([
            'committee_group_id' => $group->id,
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'udm',
            'scope_key' => 'UDM ALPHA',
            'scope_name' => 'UDM ALPHA',
        ]);
    }

    $this->actingAs($user)
        ->get(route('jawatankuasa.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('udm_n8n_message', fn ($message) => str_contains($message, '1) UDM ALPHA 🌸🌸🌸🌸🌸')
                && str_contains($message, '   - JAWATANKUASA UDM ✅')));
});

it('blocks jawatankuasa route when user role does not have module access', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('jawatankuasa.index'))
        ->assertRedirect(route('login'));
});

it('allows authorized user to create, update, and delete committee positions', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();

    $this->actingAs($user)
        ->post(route('jawatankuasa.positions.store'), [
            'name' => 'Pengerusi',
            'sort_order' => 1,
        ])
        ->assertRedirect(route('jawatankuasa.index'));

    $positionId = CommitteePosition::query()->where('name', 'Pengerusi')->value('id');

    expect($positionId)->not->toBeNull();

    $this->actingAs($user)
        ->put(route('jawatankuasa.positions.update', $positionId), [
            'name' => 'Timbalan Pengerusi',
            'sort_order' => 2,
        ])
        ->assertRedirect(route('jawatankuasa.index'));

    $this->assertDatabaseHas('committee_positions', [
        'id' => $positionId,
        'name' => 'Timbalan Pengerusi',
        'sort_order' => 2,
    ]);

    $this->actingAs($user)
        ->delete(route('jawatankuasa.positions.destroy', $positionId))
        ->assertRedirect(route('jawatankuasa.index'));

    $this->assertDatabaseMissing('committee_positions', [
        'id' => $positionId,
    ]);
});

it('creates multiple committee positions from comma separated names and keeps the order', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();

    $this->actingAs($user)
        ->post(route('jawatankuasa.positions.store'), [
            'name' => 'Pengerusi, Setiausaha, Bendahari',
            'sort_order' => 1,
        ])
        ->assertRedirect(route('jawatankuasa.index'));

    $positions = CommitteePosition::query()
        ->orderBy('sort_order')
        ->pluck('name', 'sort_order')
        ->all();

    expect($positions)->toBe([
        1 => 'Pengerusi',
        2 => 'Setiausaha',
        3 => 'Bendahari',
    ]);
});

it('requires unique committee position name', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();

    CommitteePosition::query()->create([
        'name' => 'Setiausaha',
        'slug' => 'setiausaha',
        'sort_order' => 1,
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.positions.store'), [
            'name' => 'Setiausaha',
            'sort_order' => 2,
        ])
        ->assertSessionHasErrors('name');
});

it('rejects committee position name that only differs by surrounding spaces', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();

    CommitteePosition::query()->create([
        'name' => 'Pengerusi',
        'slug' => 'pengerusi',
        'sort_order' => 1,
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.positions.store'), [
            'name' => '  Pengerusi  ',
            'sort_order' => 3,
        ])
        ->assertSessionHasErrors('name');
});

it('prevents updating committee position to an existing name', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();

    $first = CommitteePosition::query()->create([
        'name' => 'Pengerusi',
        'slug' => 'pengerusi',
        'sort_order' => 1,
    ]);

    $second = CommitteePosition::query()->create([
        'name' => 'Setiausaha',
        'slug' => 'setiausaha',
        'sort_order' => 2,
    ]);

    $this->actingAs($user)
        ->put(route('jawatankuasa.positions.update', $second), [
            'name' => ' Pengerusi ',
            'sort_order' => 2,
        ])
        ->assertSessionHasErrors('name');

    expect($first->fresh()->name)->toBe('Pengerusi')
        ->and($second->fresh()->name)->toBe('Setiausaha');
});

it('prevents deleting committee position that is already assigned', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $position = CommitteePosition::query()->create([
        'name' => 'Bendahari',
        'slug' => 'bendahari',
        'sort_order' => 1,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
    ]);

    CommitteeMembership::query()->create([
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'jprd',
        'scope_key' => 'jprd',
        'scope_name' => 'JPRD',
        'parent_scope_name' => null,
    ]);

    $this->actingAs($user)
        ->delete(route('jawatankuasa.positions.destroy', $position))
        ->assertRedirect(route('jawatankuasa.index'));

    $this->assertDatabaseHas('committee_positions', [
        'id' => $position->id,
        'name' => 'Bendahari',
    ]);
});

it('returns only active voter suggestions for jawatankuasa search', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();

    PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'phone_mobile' => '0123456789',
        'status' => 'aktif',
    ]);

    PemilihRecord::query()->create([
        'identity_number' => '880808025333',
        'no_kp' => '880808025333',
        'name' => 'ALI LAMA',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'phone_mobile' => '0198888777',
        'status' => 'xaktif',
    ]);

    $this->actingAs($user)
        ->getJson(route('jawatankuasa.search').'?q=ali')
        ->assertOk()
        ->assertJsonCount(1, 'suggestions')
        ->assertJsonPath('suggestions.0.name', 'ALI BIN ABU')
        ->assertJsonPath('suggestions.0.status', 'aktif');
});

it('allows authorized user to add active voter as ahli jprd', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $position = CommitteePosition::query()->create([
        'name' => 'Pengerusi',
        'slug' => 'pengerusi',
        'sort_order' => 1,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.memberships.store'), [
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'jprd',
            'scope_key' => 'jprd',
        ])
        ->assertRedirect(route('jawatankuasa.index'));

    $this->assertDatabaseHas('committee_memberships', [
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'jprd',
        'scope_key' => 'jprd',
        'scope_name' => 'JPRD',
    ]);
});

it('allows authorized user to add active voter as ahli udm', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $position = CommitteePosition::query()->create([
        'name' => 'Setiausaha',
        'slug' => 'setiausaha',
        'sort_order' => 1,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.memberships.store'), [
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'udm',
            'scope_key' => 'PADANG CHICHAK',
        ])
        ->assertRedirect(route('jawatankuasa.index'));

    $this->assertDatabaseHas('committee_memberships', [
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'udm',
        'scope_key' => 'PADANG CHICHAK',
        'scope_name' => 'PADANG CHICHAK',
    ]);
});

it('allows authorized user to add active voter as ahli cawangan', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $position = CommitteePosition::query()->create([
        'name' => 'AJK',
        'slug' => 'ajk',
        'sort_order' => 3,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.memberships.store'), [
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'cawangan',
            'scope_key' => 'PADANG CHICHAK|KG BARU KURA',
        ])
        ->assertRedirect(route('jawatankuasa.index'));

    $this->assertDatabaseHas('committee_memberships', [
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'cawangan',
        'scope_key' => 'PADANG CHICHAK|KG BARU KURA',
        'scope_name' => 'KG BARU KURA',
        'parent_scope_name' => 'PADANG CHICHAK',
    ]);
});

it('prevents adding inactive voter as ahli jawatankuasa', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $position = CommitteePosition::query()->create([
        'name' => 'AJK',
        'slug' => 'ajk',
        'sort_order' => 3,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '880808025333',
        'no_kp' => '880808025333',
        'name' => 'SITI AMINAH',
        'dm' => 'KAMPUNG BETONG',
        'locality' => 'KG BETONG',
        'status' => 'xaktif',
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.memberships.store'), [
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'udm',
            'scope_key' => 'KAMPUNG BETONG',
        ])
        ->assertSessionHasErrors('pemilih_record_id');
});

it('prevents duplicate committee membership in same scope', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $position = CommitteePosition::query()->create([
        'name' => 'Ketua Penerangan',
        'slug' => 'ketua-penerangan',
        'sort_order' => 5,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
    ]);

    CommitteeMembership::query()->create([
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'udm',
        'scope_key' => 'PADANG CHICHAK',
        'scope_name' => 'PADANG CHICHAK',
        'parent_scope_name' => null,
    ]);

    $this->actingAs($user)
        ->post(route('jawatankuasa.memberships.store'), [
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => 'udm',
            'scope_key' => 'PADANG CHICHAK',
        ])
        ->assertSessionHasErrors('committee_position_id');
});

it('allows authorized user to delete committee membership', function () {
    $user = User::factory()->withModules(['dashboard', 'jawatankuasa'])->create();
    $position = CommitteePosition::query()->create([
        'name' => 'AJK',
        'slug' => 'ajk',
        'sort_order' => 3,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
    ]);

    $membership = CommitteeMembership::query()->create([
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'cawangan',
        'scope_key' => 'PADANG CHICHAK|KG BARU KURA',
        'scope_name' => 'KG BARU KURA',
        'parent_scope_name' => 'PADANG CHICHAK',
    ]);

    $this->actingAs($user)
        ->delete(route('jawatankuasa.memberships.destroy', $membership))
        ->assertRedirect(route('jawatankuasa.index'));

    $this->assertDatabaseMissing('committee_memberships', [
        'id' => $membership->id,
    ]);
});
