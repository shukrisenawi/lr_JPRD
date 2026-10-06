<?php

use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function createKeluargaPemilihRecord(array $attributes = []): PemilihRecord
{
    return PemilihRecord::query()->create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'name' => 'Pemilih Ujian',
        'no_kp' => (string) random_int(100000000000, 999999999999),
        'dm' => 'UDM 1',
        'locality' => 'LOKALITI A',
        'status' => 'aktif',
        'is_manual' => false,
    ], $attributes));
}

it('creates a voter family manually, adds members, and removes a member', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    $first = createKeluargaPemilihRecord(['name' => 'AHMAD BIN ALI']);
    $second = createKeluargaPemilihRecord(['name' => 'SITI BINTI ALI']);
    $third = createKeluargaPemilihRecord(['name' => 'AMIR BIN ALI']);

    $this->actingAs($user)
        ->post(route('keluarga-pemilih.store'), [
            'name' => 'Keluarga Ali',
            'pemilih_ids' => [$first->id, $second->id],
        ])
        ->assertRedirect(route('keluarga-pemilih.index'));

    $familyId = DB::table('pemilih_families')->value('id');
    $this->assertDatabaseCount('pemilih_family_members', 2);

    $this->actingAs($user)
        ->post(route('keluarga-pemilih.members.store', $familyId), [
            'pemilih_ids' => [$third->id],
        ])
        ->assertRedirect(route('keluarga-pemilih.index'));

    $this->assertDatabaseCount('pemilih_family_members', 3);

    $this->actingAs($user)
        ->delete(route('keluarga-pemilih.members.destroy', [$familyId, $third->id]))
        ->assertRedirect(route('keluarga-pemilih.index'));

    $this->assertDatabaseMissing('pemilih_family_members', [
        'pemilih_family_id' => $familyId,
        'pemilih_record_id' => $third->id,
    ]);

    $this->actingAs($user)
        ->get(route('keluarga-pemilih.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('KeluargaPemilih/Index')
            ->where('families.data.0.name', 'Keluarga Ali')
            ->where('families.data.0.member_count', 2)
            ->where('stats.assigned', 2)
            ->where('stats.unassigned', 1));
});

it('auto-groups only voters with exact house, address, locality, and UDM matches', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();

    foreach (['AHMAD BIN ALI', 'SITI BINTI ALI', 'AMIR BIN ALI'] as $name) {
        createKeluargaPemilihRecord([
            'name' => $name,
            'no_rumah' => '12A',
            'alamat_kediaman' => 'NO 12A, JALAN MAWAR',
        ]);
    }

    $sameHouseDifferentAddress = createKeluargaPemilihRecord([
        'name' => 'RANI BINTI ABU',
        'no_rumah' => '12A',
        'alamat_kediaman' => 'NO 12A, JALAN MELUR',
    ]);
    createKeluargaPemilihRecord([
        'name' => 'RAHIM BIN ABU',
        'no_rumah' => '99',
        'alamat_kediaman' => 'NO 99, JALAN MELUR',
    ]);

    $this->actingAs($user)
        ->post(route('keluarga-pemilih.auto'))
        ->assertRedirect(route('keluarga-pemilih.index'))
        ->assertSessionHas('success', 'Auto selesai: 1 keluarga berpadanan kuat dibentuk, melibatkan 3 pemilih.');

    $this->assertDatabaseCount('pemilih_families', 1);
    $this->assertDatabaseCount('pemilih_family_members', 3);
    $this->assertDatabaseMissing('pemilih_family_members', ['pemilih_record_id' => $sameHouseDifferentAddress->id]);

    $this->actingAs($user)
        ->post(route('keluarga-pemilih.auto'))
        ->assertSessionHas('success', 'Tiada kumpulan yang cukup padanan kuat untuk dijadikan keluarga secara automatik.');

    $this->assertDatabaseCount('pemilih_families', 1);
});

it('sorts manual suggestions by strong address and bin or binti matches', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    $anchor = createKeluargaPemilihRecord([
        'name' => 'AHMAD BIN HASHIM',
        'no_rumah' => '12A',
        'alamat_kediaman' => 'NO 12A, JALAN MAWAR',
    ]);
    $sameParent = createKeluargaPemilihRecord([
        'name' => 'SITI BINTI HASHIM',
        'no_rumah' => '20',
        'alamat_kediaman' => 'NO 20, JALAN MAWAR',
    ]);
    $sameHouseAndAddress = createKeluargaPemilihRecord([
        'name' => 'AMIR BIN ABU',
        'no_rumah' => '12A',
        'alamat_kediaman' => 'NO 12A, JALAN MAWAR',
        'avatar' => 'avatars/amir.jpg',
    ]);
    createKeluargaPemilihRecord([
        'name' => 'RANI BINTI ABU',
        'no_rumah' => '99',
        'alamat_kediaman' => 'NO 99, JALAN MAWAR',
    ]);

    $this->actingAs($user)
        ->getJson(route('keluarga-pemilih.search', ['anchor_id' => $anchor->id]))
        ->assertOk()
        ->assertJsonPath('voters.0.id', $sameHouseAndAddress->id)
        ->assertJsonPath('voters.0.avatar_url', route('pemilih.avatar', [
            'pemilihRecord' => $sameHouseAndAddress->id,
            't' => $sameHouseAndAddress->updated_at->timestamp,
        ]))
        ->assertJsonPath('voters.0.match_score', 100)
        ->assertJsonPath('voters.1.id', $sameParent->id)
        ->assertJsonPath('voters.1.match_reasons.0', 'Bin/Binti sama');
});

it('does not allow users to create a family outside their voter scope', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM 1',
    ]);
    $outsideVoter = createKeluargaPemilihRecord(['dm' => 'UDM 2']);

    $this->actingAs($user)
        ->from(route('keluarga-pemilih.index'))
        ->post(route('keluarga-pemilih.store'), [
            'name' => 'Keluarga Luar Skop',
            'pemilih_ids' => [$outsideVoter->id],
        ])
        ->assertSessionHasErrors('pemilih_ids');

    $this->assertDatabaseCount('pemilih_families', 0);
});

it('shows UDM family and unassigned voter counts and filters the family list', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();

    $udmOneMembers = [
        createKeluargaPemilihRecord(['name' => 'AHMAD BIN ALI', 'dm' => 'UDM 1']),
        createKeluargaPemilihRecord(['name' => 'SITI BINTI ALI', 'dm' => 'UDM 1']),
    ];
    createKeluargaPemilihRecord(['name' => 'UNASSIGNED UDM 1', 'dm' => 'UDM 1']);

    $udmTwoMembers = [
        createKeluargaPemilihRecord(['name' => 'RAHIM BIN ABU', 'dm' => 'UDM 2']),
    ];
    $udmTwoUnassigned = createKeluargaPemilihRecord(['name' => 'UNASSIGNED UDM 2 A', 'dm' => 'UDM 2']);
    createKeluargaPemilihRecord(['name' => 'UNASSIGNED UDM 2 B', 'dm' => 'UDM 2', 'locality' => 'LOKALITI B']);

    $this->actingAs($user)
        ->post(route('keluarga-pemilih.store'), [
            'name' => 'Keluarga UDM 1',
            'pemilih_ids' => collect($udmOneMembers)->pluck('id')->all(),
        ])
        ->assertRedirect(route('keluarga-pemilih.index'));

    $this->actingAs($user)
        ->post(route('keluarga-pemilih.store'), [
            'name' => 'Keluarga UDM 2',
            'pemilih_ids' => collect($udmTwoMembers)->pluck('id')->all(),
        ])
        ->assertRedirect(route('keluarga-pemilih.index'));

    $udmTwoFamilyId = DB::table('pemilih_families')->where('name', 'Keluarga UDM 2')->value('id');
    $this->actingAs($user)
        ->post(route('keluarga-pemilih.members.store', $udmTwoFamilyId), [
            'pemilih_ids' => [$udmTwoUnassigned->id],
            'udm' => 'UDM 2',
            'locality' => 'LOKALITI A',
        ])
        ->assertRedirect(route('keluarga-pemilih.index', ['udm' => 'UDM 2', 'locality' => 'LOKALITI A']));

    $this->actingAs($user)
        ->get(route('keluarga-pemilih.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.udm', '')
            ->where('stats.families', 2)
            ->where('stats.voters', 6)
            ->where('stats.unassigned', 2)
            ->where('udmSummaries.0.udm', 'UDM 1')
            ->where('udmSummaries.0.families', 1)
            ->where('udmSummaries.0.unassigned', 1)
            ->where('udmSummaries.1.udm', 'UDM 2')
            ->where('udmSummaries.1.families', 1)
            ->where('udmSummaries.1.unassigned', 1));

    $this->actingAs($user)
        ->get(route('keluarga-pemilih.index', ['udm' => 'UDM 2']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.udm', 'UDM 2')
            ->where('stats.families', 1)
            ->where('stats.voters', 3)
            ->where('stats.assigned', 2)
            ->where('stats.unassigned', 1)
            ->where('allStats.families', 2)
            ->where('allStats.voters', 6)
            ->where('allStats.unassigned', 2)
            ->where('families.data.0.name', 'Keluarga UDM 2')
            ->where('families.total', 1));

    $this->actingAs($user)
        ->get(route('keluarga-pemilih.index', ['udm' => 'UDM 2', 'locality' => 'LOKALITI B']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.udm', 'UDM 2')
            ->where('filters.locality', 'LOKALITI B')
            ->where('stats.families', 0)
            ->where('stats.voters', 1)
            ->where('stats.unassigned', 1)
            ->where('families.total', 0));
});

it('allows a family label to be renamed', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    $voter = createKeluargaPemilihRecord(['name' => 'NURULSHAHIDA BINTI ABDUL HALIM']);

    $this->actingAs($user)
        ->post(route('keluarga-pemilih.store'), [
            'name' => 'Keluarga Baharu',
            'pemilih_ids' => [$voter->id],
        ])
        ->assertRedirect(route('keluarga-pemilih.index'));

    $familyId = DB::table('pemilih_families')->value('id');
    $newName = 'Keluarga NURULSHAHIDA BINTI ABDUL HALIM';

    $this->actingAs($user)
        ->put(route('keluarga-pemilih.update', $familyId), ['name' => $newName])
        ->assertRedirect(route('keluarga-pemilih.index'))
        ->assertSessionHas('success', 'Nama keluarga berjaya dikemaskini.');

    $this->assertDatabaseHas('pemilih_families', ['id' => $familyId, 'name' => $newName]);
});

it('marks a family father and flags only children with that fathers bin or binti name', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    $father = createKeluargaPemilihRecord(['name' => 'ABDUL HALIM BIN MOHAMAD']);
    $mother = createKeluargaPemilihRecord(['name' => 'NORAINI BINTI RAHMAN']);
    $child = createKeluargaPemilihRecord(['name' => 'NURULSHAHIDA BINTI ABDUL HALIM']);
    $otherChild = createKeluargaPemilihRecord(['name' => 'FARAH BINTI MOHAMAD']);

    $this->actingAs($user)
        ->post(route('keluarga-pemilih.store'), [
            'name' => 'Keluarga NORAINI BINTI RAHMAN',
            'pemilih_ids' => [$mother->id, $father->id],
        ])
        ->assertRedirect(route('keluarga-pemilih.index'));

    $familyId = DB::table('pemilih_families')->value('id');

    $this->actingAs($user)
        ->putJson(route('keluarga-pemilih.father.update', $familyId), ['father_id' => $father->id])
        ->assertOk()
        ->assertJsonPath('father_id', $father->id)
        ->assertJsonPath('father_name', 'ABDUL HALIM BIN MOHAMAD')
        ->assertJsonPath('family_name', 'Keluarga ABDUL HALIM BIN MOHAMAD');

    $this->assertDatabaseHas('pemilih_families', [
        'id' => $familyId,
        'father_pemilih_record_id' => $father->id,
        'name' => 'Keluarga ABDUL HALIM BIN MOHAMAD',
    ]);

    $this->actingAs($user)
        ->getJson(route('keluarga-pemilih.search', [
            'anchor_id' => $father->id,
            'anchor_as_father' => 1,
        ]))
        ->assertOk()
        ->assertJsonPath('voters.0.id', $child->id)
        ->assertJsonPath('voters.0.match_reasons.0', 'Bin/Binti sama')
        ->assertJsonPath('voters.1.id', $otherChild->id)
        ->assertJsonPath('voters.1.match_reasons.0', 'Lokaliti sama');

    $this->actingAs($user)
        ->get(route('keluarga-pemilih.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('families.data.0.father_id', $father->id)
            ->where('families.data.0.father_name', 'ABDUL HALIM BIN MOHAMAD'));
});
