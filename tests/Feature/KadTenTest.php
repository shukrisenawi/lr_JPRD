<?php

use App\Models\CommitteeGroup;
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

it('allows a scoped UDM to create a Kad 10 with any active pemilih as leader', function () {
    $udmUser = kadTenUser();
    $leader = kadTenVoter(['name' => 'KETUA ALPHA']);
    $outsideLeader = kadTenVoter(['name' => 'KETUA BETA', 'dm' => 'UDM BETA']);

    $this->actingAs($udmUser)
        ->post(route('kad-ten.store'), [
            'name' => 'Kad Alpha',
            'pemimpin_id' => $leader->id,
            'level' => 'udm',
        ])
        ->assertRedirect(route('kad-ten.index'));

    expect(KadTen::query()->where('pemimpin_id', $leader->id)->value('committee_membership_id'))->toBeNull();

    $cawanganLeader = kadTenVoter([
        'name' => 'KETUA CAWANGAN BUKAN AJK',
        'locality' => 'LOKALITI DUA',
    ]);

    $this->actingAs($udmUser)
        ->post(route('kad-ten.store'), [
            'pemimpin_id' => $cawanganLeader->id,
            'level' => 'cawangan',
        ])
        ->assertRedirect(route('kad-ten.index'));

    expect(KadTen::query()->where('pemimpin_id', $cawanganLeader->id)->value('scope_key'))
        ->toBe('UDM ALPHA|LOKALITI DUA');

    $this->actingAs($udmUser)
        ->post(route('kad-ten.store'), [
            'pemimpin_id' => $outsideLeader->id,
            'level' => 'udm',
        ])
        ->assertSessionHasErrors('pemimpin_id');

    $this->actingAs(kadTenUser('jprd', null))
        ->postJson(route('kad-ten.store'), ['pemimpin_id' => $leader->id, 'level' => 'udm'])
        ->assertForbidden();
});

it('suggests non-AJK pemilih as Kad 10 leaders', function () {
    $user = kadTenUser();
    $leader = kadTenVoter(['name' => 'PEMILIH BUKAN AJK']);

    $this->actingAs($user)
        ->getJson(route('kad-ten.suggest-pemimpin', ['q' => 'BUKAN AJK', 'level' => 'udm']))
        ->assertOk()
        ->assertJsonPath('suggestions.0.id', $leader->id)
        ->assertJsonPath('suggestions.0.level', 'udm')
        ->assertJsonPath('suggestions.0.scope_key', 'UDM ALPHA');
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
            ->where('kads.data.0.member_count', 11)
            ->where('kads.data.0.is_complete', true));
});

it('paginates Kad 10 cards at twenty per page', function () {
    $user = kadTenUser();

    collect(range(1, 21))->each(function (): void {
        $leader = kadTenVoter();
        $membership = kadTenMembership($leader);
        kadTenRecord($leader, $membership);
    });

    $this->actingAs($user)
        ->get(route('kad-ten.index'))
        ->assertInertia(fn ($page) => $page
            ->where('kads.per_page', 20)
            ->where('kads.total', 21)
            ->where('kads.data', fn ($data) => count($data) === 20)
            ->where('kad_stats.total', 21));
});

it('loads all eligible voters in the unassigned Kad 10 list without pagination', function () {
    $user = kadTenUser();

    collect(range(1, 21))->each(fn () => kadTenVoter());

    $this->actingAs($user)
        ->get(route('kad-ten.senarai-pemilih'))
        ->assertInertia(fn ($page) => $page
            ->where('voters', fn ($voters) => count($voters) === 21));
});

it('lets only a master admin auto-create cards from the UDM main committee and assign up to ten members', function () {
    $admin = User::factory()->masterAdmin()->create();
    $group = CommitteeGroup::query()->create([
        'name' => 'JAWATANKUASA UDM',
        'levels' => ['udm'],
    ]);
    $position = CommitteePosition::query()->create([
        'name' => 'AJK Utama',
        'slug' => 'ajk-utama',
        'sort_order' => 1,
    ]);
    $ignoredGroup = CommitteeGroup::query()->create([
        'name' => 'JAWATANKUASA UTAMA',
        'levels' => ['jprd'],
    ]);
    $ignoredPosition = CommitteePosition::query()->create([
        'name' => 'AJK Utama JPRD',
        'slug' => 'ajk-utama-jprd',
        'sort_order' => 1,
    ]);
    $leaders = collect(range(1, 2))->map(fn (int $number) => kadTenVoter([
        'name' => 'AJK UTAMA '.$number,
    ]));
    $ignoredLeader = kadTenVoter(['name' => 'AJK JPRD DIABAIKAN', 'dm' => 'UDM BETA']);

    foreach ($leaders as $leader) {
        CommitteeMembership::query()->create([
            'committee_group_id' => $group->id,
            'pemilih_record_id' => $leader->id,
            'committee_position_id' => $position->id,
            'level' => 'udm',
            'scope_key' => 'UDM ALPHA',
            'scope_name' => 'UDM ALPHA',
        ]);
    }
    CommitteeMembership::query()->create([
        'committee_group_id' => $ignoredGroup->id,
        'pemilih_record_id' => $ignoredLeader->id,
        'committee_position_id' => $ignoredPosition->id,
        'level' => 'jprd',
        'scope_key' => 'jprd',
        'scope_name' => 'JPRD',
    ]);

    collect(range(1, 25))->each(fn (int $number) => kadTenVoter([
        'name' => 'PEMILIH RAWAK '.$number,
    ]));

    $this->actingAs(kadTenUser())
        ->postJson(route('kad-ten.auto-input'))
        ->assertForbidden();

    $this->actingAs($admin)
        ->postJson(route('kad-ten.auto-input'))
        ->assertOk()
        ->assertJsonPath('leaders_count', 2)
        ->assertJsonPath('cards_created', 2)
        ->assertJsonPath('members_assigned', 20);

    expect(KadTen::query()->count())->toBe(2);
    expect(KadTen::query()->where('level', 'udm')->where('scope_key', 'UDM ALPHA')->count())->toBe(2);
    expect(KadTen::query()->withCount('members')->pluck('members_count')->min())->toBe(10);
    expect(KadTen::query()->withCount('members')->pluck('members_count')->max())->toBe(10);
    expect(KadTenMember::query()->count())->toBe(20);
    expect(KadTenMember::query()->whereNotNull('match_reason')->count())->toBe(0);
    expect(KadTenMember::query()->whereIn('pemilih_record_id', $leaders->pluck('id'))->count())->toBe(0);
    expect(KadTenMember::query()->select('pemilih_record_id')->distinct()->count())->toBe(20);

    $this->actingAs($admin)
        ->postJson(route('kad-ten.auto-input'))
        ->assertOk()
        ->assertJsonPath('cards_created', 0)
        ->assertJsonPath('members_assigned', 0);

    $this->actingAs($admin)
        ->get(route('kad-ten.index'))
        ->assertInertia(fn ($page) => $page
            ->where('can_auto_input', true));
});

it('prioritizes the closest eligible voters before filling the ten-member limit', function () {
    $admin = User::factory()->masterAdmin()->create();
    $group = CommitteeGroup::query()->create([
        'name' => 'JAWATANKUASA UDM',
        'levels' => ['udm'],
    ]);
    $position = CommitteePosition::query()->create([
        'name' => 'AJK Utama',
        'slug' => 'ajk-utama',
        'sort_order' => 1,
    ]);
    $leader = kadTenVoter([
        'name' => 'AJK UTAMA',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'no_rumah' => '10',
        'address' => 'JALAN ALPHA 10',
    ]);

    CommitteeMembership::query()->create([
        'committee_group_id' => $group->id,
        'pemilih_record_id' => $leader->id,
        'committee_position_id' => $position->id,
        'level' => 'udm',
        'scope_key' => 'UDM ALPHA',
        'scope_name' => 'UDM ALPHA',
    ]);

    $closest = collect(range(1, 10))->map(fn (int $number) => kadTenVoter([
        'name' => 'PEMILIH HAMPIR '.$number,
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'no_rumah' => '10',
        'address' => 'JALAN ALPHA 10',
    ]));
    $farSameUdm = kadTenVoter([
        'name' => 'PEMILIH JAUH DALAM UDM',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI LAIN',
        'no_rumah' => '99',
        'address' => 'JALAN BETA 99',
    ]);
    $farOtherUdm = kadTenVoter([
        'name' => 'PEMILIH UDM LAIN',
        'dm' => 'UDM BETA',
        'locality' => 'LOKALITI LAIN',
        'no_rumah' => '99',
        'address' => 'JALAN BETA 99',
    ]);

    $this->actingAs($admin)
        ->postJson(route('kad-ten.auto-input'))
        ->assertOk()
        ->assertJsonPath('members_assigned', 10);

    expect(KadTenMember::query()->whereIn('pemilih_record_id', $closest->pluck('id'))->count())->toBe(10);
    expect(KadTenMember::query()->where('pemilih_record_id', $farSameUdm->id)->exists())->toBeFalse();
    expect(KadTenMember::query()->where('pemilih_record_id', $farOtherUdm->id)->exists())->toBeFalse();
});

it('lets only a master admin reset Kad 10 cards and members without deleting committee memberships', function () {
    $admin = User::factory()->masterAdmin()->create();
    $leader = kadTenVoter(['name' => 'KETUA UDM']);
    $membership = kadTenMembership($leader);
    $kad = kadTenRecord($leader, $membership);
    $member = kadTenVoter(['name' => 'AHLI UDM']);
    KadTenMember::query()->create([
        'kad_ten_id' => $kad->id,
        'pemilih_record_id' => $member->id,
    ]);

    $this->actingAs(kadTenUser())
        ->postJson(route('kad-ten.reset-auto-input'))
        ->assertForbidden();

    $this->actingAs($admin)
        ->postJson(route('kad-ten.reset-auto-input'))
        ->assertOk()
        ->assertJsonPath('cards_deleted', 1)
        ->assertJsonPath('members_deleted', 1);

    expect(KadTen::query()->count())->toBe(0);
    expect(KadTenMember::query()->count())->toBe(0);
    expect(CommitteeMembership::query()->count())->toBe(1);
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
        ->assertInertia(fn ($page) => $page
            ->where('can_manage', false)
            ->where('can_auto_input', false));

    $this->actingAs($jprd)
        ->deleteJson(route('kad-ten.members.destroy', [$kad, $memberRecord]))
        ->assertForbidden();

    $this->actingAs(kadTenUser())
        ->delete(route('kad-ten.members.destroy', [$otherKad, $memberRecord]))
        ->assertNotFound();
});
