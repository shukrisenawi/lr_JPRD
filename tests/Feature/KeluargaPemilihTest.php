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
