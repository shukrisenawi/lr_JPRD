<?php

use App\Models\CommitteeMembership;
use App\Models\CommitteePosition;
use App\Models\KadTen;
use App\Models\KadTenMember;
use App\Models\PemilihRecord;
use App\Models\User;

function kadTenVoter(array $attributes = []): PemilihRecord
{
    static $number = 0;
    $number++;

    return PemilihRecord::query()->create(array_merge([
        'identity_number' => '900101025'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
        'no_kp' => '900101025'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
        'name' => 'PEMILIH KAD '.$number,
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'no_rumah' => '10',
        'address' => 'JALAN ALPHA 10',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => '2',
        'cula_display_label' => '2 - BERSEDIA',
    ], $attributes));
}

function kadTenMembership(PemilihRecord $voter, string $level = 'udm', string $scopeKey = 'UDM ALPHA'): CommitteeMembership
{
    static $number = 0;
    $number++;
    $position = CommitteePosition::query()->create([
        'name' => 'KETUA KAD '.$number,
        'slug' => 'ketua-kad-'.$number,
        'sort_order' => $number,
    ]);

    return CommitteeMembership::query()->create([
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => $level,
        'scope_key' => $scopeKey,
        'scope_name' => $level === 'udm' ? $scopeKey : (explode('|', $scopeKey, 2)[1] ?? $scopeKey),
        'parent_scope_name' => $level === 'cawangan' ? (explode('|', $scopeKey, 2)[0] ?? null) : null,
    ]);
}

function kadTenUser(string $level = 'udm', ?string $scopeKey = 'UDM ALPHA'): User
{
    return User::factory()
        ->withModules(['kad-ten'])
        ->create([
            'access_level' => $level,
            'scope_key' => $scopeKey,
        ]);
}

function kadTenRecord(PemilihRecord $leader, CommitteeMembership $membership, ?string $name = null): KadTen
{
    return KadTen::query()->create([
        'name' => $name,
        'pemimpin_id' => $leader->id,
        'committee_membership_id' => $membership->id,
        'level' => $membership->level,
        'scope_key' => $membership->scope_key,
        'scope_name' => $membership->scope_name,
        'parent_scope_name' => $membership->parent_scope_name,
    ]);
}

it('allows only a scoped UDM to create a Kad 10 with an AJK membership', function () {
    $udmUser = kadTenUser();
    $leader = kadTenVoter(['name' => 'KETUA ALPHA']);
    $membership = kadTenMembership($leader);
    $outsideLeader = kadTenVoter(['name' => 'KETUA BETA', 'dm' => 'UDM BETA']);
    $outsideMembership = kadTenMembership($outsideLeader, 'udm', 'UDM BETA');

    $this->actingAs($udmUser)
        ->post(route('kad-ten.store'), [
            'name' => 'Kad Alpha',
            'committee_membership_id' => $membership->id,
        ])
        ->assertRedirect(route('kad-ten.index'));

    expect(KadTen::query()->where('pemimpin_id', $leader->id)->exists())->toBeTrue();

    $this->actingAs($udmUser)
        ->post(route('kad-ten.store'), [
            'committee_membership_id' => $outsideMembership->id,
        ])
        ->assertSessionHasErrors('committee_membership_id');

    $this->actingAs(kadTenUser('jprd', null))
        ->postJson(route('kad-ten.store'), ['committee_membership_id' => $outsideMembership->id])
        ->assertForbidden();
});

it('returns recommendations ranked by address, house and locality within the Kad scope', function () {
    $user = kadTenUser();
    $leader = kadTenVoter([
        'name' => 'KETUA ALPHA',
        'no_rumah' => '22',
        'address' => 'JALAN UTAMA 22',
        'locality' => 'LOKALITI SATU',
    ]);
    $membership = kadTenMembership($leader);
    $kad = kadTenRecord($leader, $membership);
    $best = kadTenVoter(['name' => 'PADANAN ALAMAT', 'no_rumah' => '22', 'address' => 'JALAN UTAMA 22']);
    $locality = kadTenVoter(['name' => 'PADANAN LOKALITI', 'no_rumah' => '99', 'address' => 'JALAN LAIN 99']);
    $outside = kadTenVoter(['name' => 'LUAR UDM', 'dm' => 'UDM BETA', 'no_rumah' => '22', 'address' => 'JALAN UTAMA 22']);

    $this->actingAs($user)
        ->getJson(route('kad-ten.recommendations', $kad))
        ->assertOk()
        ->assertJsonPath('recommendations.0.id', $best->id)
        ->assertJsonPath('recommendations.0.match_score', 100)
        ->assertJsonPath('recommendations.0.match_type', 'alamat')
        ->assertJsonMissing(['id' => $outside->id]);

    expect($locality->exists)->toBeTrue();
});

it('enforces the seven cula codes, Kad scope and one Kad per pemilih', function () {
    $user = kadTenUser();
    $leader = kadTenVoter(['name' => 'KETUA ALPHA']);
    $membership = kadTenMembership($leader);
    $kad = kadTenRecord($leader, $membership);
    $eligible = kadTenVoter(['name' => 'LAYAK']);
    $wrongCode = kadTenVoter(['name' => 'KOD SALAH', 'cula_code' => '1']);
    $manual = kadTenVoter(['name' => 'REKOD MANUAL', 'is_manual' => true]);
    $outside = kadTenVoter(['name' => 'LUAR SKOP', 'dm' => 'UDM BETA']);

    $this->actingAs($user)
        ->postJson(route('kad-ten.members.store', $kad), [
            'pemilih_record_ids' => [$eligible->id, $wrongCode->id, $manual->id, $outside->id],
        ])
        ->assertOk()
        ->assertJsonPath('inserted', 1);

    expect(KadTenMember::query()->where('pemilih_record_id', $eligible->id)->count())->toBe(1);
    expect(KadTenMember::query()->whereIn('pemilih_record_id', [$wrongCode->id, $manual->id, $outside->id])->count())->toBe(0);

    $secondLeader = kadTenVoter(['name' => 'KETUA ALPHA DUA']);
    $secondMembership = kadTenMembership($secondLeader);
    $secondKad = kadTenRecord($secondLeader, $secondMembership);

    $this->actingAs($user)
        ->postJson(route('kad-ten.members.store', $secondKad), ['pemilih_record_ids' => [$eligible->id]])
        ->assertOk()
        ->assertJsonPath('inserted', 0)
        ->assertJsonPath('skipped', 1);

    expect(KadTenMember::query()->where('pemilih_record_id', $eligible->id)->count())->toBe(1);
});

it('allows more than ten members and reports completion based on the minimum', function () {
    $user = kadTenUser();
    $leader = kadTenVoter(['name' => 'KETUA ALPHA']);
    $membership = kadTenMembership($leader);
    $kad = kadTenRecord($leader, $membership);
    $voters = collect(range(1, 11))->map(fn (int $number) => kadTenVoter([
        'name' => 'AHLI '.$number,
        'identity_number' => '910101025'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
        'no_kp' => '910101025'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
        'no_rumah' => (string) (100 + $number),
        'address' => 'JALAN AHLI '.$number,
    ]));

    $this->actingAs($user)
        ->postJson(route('kad-ten.members.store', $kad), [
            'pemilih_record_ids' => $voters->pluck('id')->all(),
        ])
        ->assertOk()
        ->assertJsonPath('inserted', 11);

    $this->actingAs($user)
        ->get(route('kad-ten.index'))
        ->assertInertia(fn ($page) => $page
            ->where('can_manage', true)
            ->where('kads.0.member_count', 11)
            ->where('kads.0.is_complete', true));
});

it('keeps JPRD read-only and prevents deleting a member through another Kad route', function () {
    $leader = kadTenVoter(['name' => 'KETUA ALPHA']);
    $membership = kadTenMembership($leader);
    $kad = kadTenRecord($leader, $membership);
    $member = kadTenVoter(['name' => 'AHLI ALPHA']);
    $memberRecord = KadTenMember::query()->create([
        'kad_ten_id' => $kad->id,
        'pemilih_record_id' => $member->id,
    ]);
    $jprd = kadTenUser('jprd', null);
    $otherLeader = kadTenVoter(['name' => 'KETUA KEDUA']);
    $otherKad = kadTenRecord($otherLeader, kadTenMembership($otherLeader));

    $this->actingAs($jprd)
        ->get(route('kad-ten.index'))
        ->assertInertia(fn ($page) => $page->where('can_manage', false));

    $this->actingAs($jprd)
        ->deleteJson(route('kad-ten.members.destroy', [$kad, $memberRecord]))
        ->assertForbidden();

    $this->actingAs(kadTenUser())
        ->delete(route('kad-ten.members.destroy', [$otherKad, $memberRecord]))
        ->assertNotFound();
});
