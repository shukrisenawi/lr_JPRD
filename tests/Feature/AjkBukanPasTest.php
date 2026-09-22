<?php

use App\Models\CommitteeMembership;
use App\Models\CommitteePosition;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Support\Str;

function createAjkBukanPasVoter(array $attributes): PemilihRecord
{
    return PemilihRecord::query()->create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'status' => 'aktif',
        'is_manual' => false,
    ], $attributes));
}

it('lists committee members with non-PAS cula codes across all levels', function () {
    $user = User::factory()->withModules(['jawatankuasa'])->create();
    $position = CommitteePosition::query()->create([
        'name' => 'AJK',
        'slug' => 'ajk',
        'sort_order' => 1,
    ]);

    $addMembership = function (PemilihRecord $voter, string $level, string $scopeKey) use ($position): void {
        CommitteeMembership::query()->create([
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => $level,
            'scope_key' => $scopeKey,
            'scope_name' => $level === 'jprd' ? 'JPRD' : $scopeKey,
            'parent_scope_name' => $level === 'cawangan' ? 'UDM ALPHA' : null,
        ]);
    };

    $nonPas = createAjkBukanPasVoter([
        'name' => 'AHLI BUKAN PAS',
        'no_kp' => '900101010001',
        'cula_code' => '1',
    ]);
    $belumCula = createAjkBukanPasVoter([
        'name' => 'AHLI BELUM CULA',
        'no_kp' => '900101010002',
        'cula_code' => null,
    ]);
    $pasMember = createAjkBukanPasVoter([
        'name' => 'AHLI PAS',
        'no_kp' => '900101010003',
        'cula_code' => '2',
    ]);
    $pasLuar = createAjkBukanPasVoter([
        'name' => 'AHLI PAS LUAR',
        'no_kp' => '900101010004',
        'cula_code' => '3P',
    ]);
    $manual = createAjkBukanPasVoter([
        'name' => 'PEMILIH MANUAL',
        'no_kp' => '900101010005',
        'cula_code' => '1',
        'is_manual' => true,
    ]);

    $addMembership($nonPas, 'jprd', 'jprd');
    $addMembership($belumCula, 'udm', 'UDM ALPHA');
    $addMembership($pasMember, 'cawangan', 'UDM ALPHA|KAMPUNG ALPHA');
    $addMembership($pasLuar, 'cawangan', 'UDM ALPHA|KAMPUNG BETA');
    $addMembership($manual, 'jprd', 'jprd');

    $this->actingAs($user)
        ->get(route('jawatankuasa.ajk-bukan-pas'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Committee/AjkBukanPas')
            ->where('total_assignments', 2)
            ->where('members', fn ($members) => collect($members)->pluck('name')->values()->all() === ['AHLI BELUM CULA', 'AHLI BUKAN PAS'])
            ->where('members.0.memberships.0.level', 'udm')
            ->where('members.1.memberships.0.level', 'jprd')
            ->where('badgeCounts.ajkBukanPas', 2)
            ->where('available_cula_codes.0.code', '1'));
});

it('applies the users committee scope to the AJK Bukan PAS list', function () {
    $user = User::factory()->withModules(['jawatankuasa'])->create([
        'access_level' => 'cawangan',
        'scope_key' => 'UDM ALPHA|KAMPUNG ALPHA',
    ]);
    $position = CommitteePosition::query()->create([
        'name' => 'Pengerusi',
        'slug' => 'pengerusi',
        'sort_order' => 1,
    ]);

    $inScope = createAjkBukanPasVoter(['name' => 'DALAM SKOP', 'no_kp' => '900101010011', 'cula_code' => '1', 'dm' => 'UDM ALPHA', 'locality' => 'KAMPUNG ALPHA']);
    $outOfScope = createAjkBukanPasVoter(['name' => 'LUAR SKOP', 'no_kp' => '900101010012', 'cula_code' => '1', 'dm' => 'UDM ALPHA', 'locality' => 'KAMPUNG BETA']);

    CommitteeMembership::query()->create([
        'pemilih_record_id' => $inScope->id,
        'committee_position_id' => $position->id,
        'level' => 'cawangan',
        'scope_key' => 'UDM ALPHA|KAMPUNG ALPHA',
        'scope_name' => 'KAMPUNG ALPHA',
        'parent_scope_name' => 'UDM ALPHA',
    ]);
    CommitteeMembership::query()->create([
        'pemilih_record_id' => $outOfScope->id,
        'committee_position_id' => $position->id,
        'level' => 'cawangan',
        'scope_key' => 'UDM ALPHA|KAMPUNG BETA',
        'scope_name' => 'KAMPUNG BETA',
        'parent_scope_name' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->get(route('jawatankuasa.ajk-bukan-pas'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('members', fn ($members) => collect($members)->pluck('name')->values()->all() === ['DALAM SKOP']));
});

it('limits AJK Bukan PAS records to the users access level and UDM scope', function () {
    $user = User::factory()->withModules(['jawatankuasa.ajk-bukan-pas'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM ALPHA',
    ]);
    $position = CommitteePosition::query()->create([
        'name' => 'AJK UDM',
        'slug' => 'ajk-udm',
        'sort_order' => 1,
    ]);

    $addMembership = function (string $name, string $level, string $scopeKey, ?string $parentScopeName = null) use ($position): void {
        $voter = createAjkBukanPasVoter([
            'name' => $name,
            'no_kp' => '900101'.str_pad((string) (crc32($name) % 1000000), 6, '0', STR_PAD_LEFT),
            'cula_code' => '1',
        ]);

        CommitteeMembership::query()->create([
            'pemilih_record_id' => $voter->id,
            'committee_position_id' => $position->id,
            'level' => $level,
            'scope_key' => $scopeKey,
            'scope_name' => $level === 'jprd'
                ? 'JPRD'
                : (str($scopeKey)->after('|')->value() ?: $scopeKey),
            'parent_scope_name' => $parentScopeName,
        ]);
    };

    $addMembership('JPRD GLOBAL', 'jprd', 'jprd');
    $addMembership('UDM DALAM SKOP', 'udm', 'UDM ALPHA');
    $addMembership('UDM LUAR SKOP', 'udm', 'UDM BETA');
    $addMembership('CAWANGAN DALAM SKOP', 'cawangan', 'UDM ALPHA|KAMPUNG ALPHA', 'UDM ALPHA');
    $addMembership('CAWANGAN LUAR SKOP', 'cawangan', 'UDM BETA|KAMPUNG BETA', 'UDM BETA');

    $this->actingAs($user)
        ->get(route('jawatankuasa.ajk-bukan-pas'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('members', fn ($members) => collect($members)->pluck('name')->values()->all() === ['CAWANGAN DALAM SKOP', 'UDM DALAM SKOP'])
            ->where('total_assignments', 2)
            ->where('level_counts.udm', 1)
            ->where('level_counts.cawangan', 1)
            ->where('badgeCounts.ajkBukanPas', 2));
});

it('updates cula for an AJK Bukan PAS member in the users scope', function () {
    $user = User::factory()->withModules(['jawatankuasa'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM ALPHA',
    ]);
    $position = CommitteePosition::query()->create([
        'name' => 'Setiausaha',
        'slug' => 'setiausaha',
        'sort_order' => 1,
    ]);
    $voter = createAjkBukanPasVoter([
        'name' => 'AHLI UNTUK CULA',
        'no_kp' => '900101010021',
        'dm' => 'UDM ALPHA',
        'cula_code' => '1',
    ]);
    CommitteeMembership::query()->create([
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'udm',
        'scope_key' => 'UDM ALPHA',
        'scope_name' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->postJson(route('jawatankuasa.ajk-bukan-pas.cula', $voter), [
            'cula_code' => '2',
            'cula_display_label' => '2 - PAS',
        ])
        ->assertOk()
        ->assertJsonPath('voter_id', $voter->id);

    $this->assertDatabaseHas('pemilih_records', [
        'id' => $voter->id,
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
    ]);
    $this->assertDatabaseHas('cula_work_items', [
        'pemilih_record_id' => $voter->id,
        'marked_by' => $user->id,
    ]);
});

it('requires the AJK Bukan PAS module permission', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('jawatankuasa.ajk-bukan-pas'))
        ->assertRedirect(route('profile.edit', absolute: false));
});
