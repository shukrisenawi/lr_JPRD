<?php

use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Models\User;
use App\Support\CulaCodes;
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
    $pending = createPlkRecord(['name' => 'BELUM SEMAK', 'catatan' => 'Perlu dihubungi semula']);
    $checked = createPlkRecord([
        'name' => 'SUDAH SEMAK',
        'cula_code' => '3U',
        'plk_verified_at' => now(),
        'plk_verified_by' => $user->id,
        'plk_verification_status' => 'maklumat_sah',
        'plk_verification_remark' => 'Maklumat disahkan di lapangan.',
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
            ->where('badgeCounts.plkBelumSemak', 1)
            ->where('code_counts.3B', 1)
            ->where('code_counts.3U', 1)
            ->where('voters.total', 2)
            ->where('voters.data.0.id', $pending->id)
            ->where('voters.data.0.cula_code', '3B')
            ->where('voters.data.0.catatan', 'Perlu dihubungi semula'));

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
            ->where('voters.data.0.verified_by', $user->name)
            ->where('voters.data.0.verification_status', 'maklumat_sah')
            ->where('voters.data.0.verification_remark', 'Maklumat disahkan di lapangan.'));
});

it('marks a PLK voter as verified by the current user', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord();

    $this->actingAs($user)
        ->post(route('plk.verify', $voter), [
            'status' => 'maklumat_tidak_sah',
            'remark' => 'Nombor telefon tidak tepat.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('pemilih_records', [
        'id' => $voter->id,
        'plk_verified_by' => $user->id,
        'plk_verification_status' => 'maklumat_tidak_sah',
        'plk_verification_remark' => 'Nombor telefon tidak tepat.',
    ]);
    expect($voter->fresh()->plk_verified_at)->not->toBeNull();
});

it('requires a valid status when verifying a PLK voter', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord();

    $this->actingAs($user)
        ->post(route('plk.verify', $voter), [
            'status' => 'not-a-valid-status',
            'remark' => 'Semakan belum selesai.',
        ])
        ->assertSessionHasErrors('status');

    expect($voter->fresh()->plk_verified_at)->toBeNull();
});

it('updates a PLK voters cula code and marks the voter as processed', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord(['cula_code' => '3B']);

    $this->actingAs($user)
        ->postJson(route('plk.update-cula', $voter), ['cula_code' => '3D'])
        ->assertOk()
        ->assertJsonPath('voter_id', $voter->id);

    $this->assertDatabaseHas('pemilih_records', [
        'id' => $voter->id,
        'cula_code' => '3D',
        'cula_display_label' => 'PAS LUAR DUN',
    ]);
    $this->assertDatabaseHas('cula_work_items', [
        'pemilih_record_id' => $voter->id,
        'marked_by' => $user->id,
    ]);
});

it('accepts non PLK codes when completing a PLK cula action', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord();

    $this->actingAs($user)
        ->postJson(route('plk.update-cula', $voter), ['cula_code' => '2'])
        ->assertOk();

    expect($voter->fresh()->cula_code)->toBe('2');
    $this->assertDatabaseHas('cula_work_items', ['pemilih_record_id' => $voter->id]);
});

it('rejects unknown codes when completing a PLK cula action', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord();

    $this->actingAs($user)
        ->postJson(route('plk.update-cula', $voter), ['cula_code' => 'INVALID'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cula_code');

    expect($voter->fresh()->cula_code)->toBe('3B');
    $this->assertDatabaseMissing('cula_work_items', ['pemilih_record_id' => $voter->id]);
});

it('filters UDM voters and exports by locality within their scope', function () {
    $user = User::factory()->withModules(['plk'])->create(['access_level' => 'udm', 'scope_key' => 'UDM A']);
    $voter = createPlkRecord(['locality' => 'LOKALITI A']);
    createPlkRecord(['locality' => 'LOKALITI B']);
    createPlkRecord(['dm' => 'UDM B', 'locality' => 'LOKALITI LUAR']);

    $this->actingAs($user)->get(route('plk.index', ['locality' => 'LOKALITI A']))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->where('localities', ['LOKALITI A', 'LOKALITI B'])
        ->where('filters.locality', 'LOKALITI A')
        ->where('cula_options', CulaCodes::options())
        ->has('codes', 6)
        ->where('voters.total', 1)
        ->where('voters.data.0.id', $voter->id));

    $this->getJson(route('plk.export', ['locality' => 'LOKALITI A']))
        ->assertOk()->assertJsonCount(1, 'voters')->assertJsonPath('voters.0.locality', 'LOKALITI A');
});

it('cancels a PLK verification and returns the voter to the full list', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord([
        'plk_verified_at' => now(),
        'plk_verified_by' => $user->id,
        'plk_verification_status' => 'maklumat_tidak_sah',
        'plk_verification_remark' => 'Data perlu dikemas kini.',
    ]);

    $this->actingAs($user)
        ->delete(route('plk.unverify', $voter))
        ->assertRedirect();

    $this->assertDatabaseHas('pemilih_records', [
        'id' => $voter->id,
        'plk_verified_at' => null,
        'plk_verified_by' => null,
        'plk_verification_status' => null,
        'plk_verification_remark' => null,
    ]);

    $this->actingAs($user)
        ->get(route('plk.index', ['tab' => 'disemak']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('voters.total', 0));
});

it('only allows the original verifier to see and use PLK rollback', function () {
    $verifier = User::factory()->withModules(['plk'])->create();
    $otherUser = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord([
        'plk_verified_at' => now(),
        'plk_verified_by' => $verifier->id,
        'plk_verification_status' => 'maklumat_sah',
        'plk_verification_remark' => 'Semakan asal.',
    ]);

    $this->actingAs($verifier)->get(route('plk.index', ['tab' => 'disemak']))
        ->assertOk()->assertInertia(fn ($page) => $page->where('voters.data.0.can_unverify', true));

    $this->actingAs($otherUser)->get(route('plk.index', ['tab' => 'disemak']))
        ->assertOk()->assertInertia(fn ($page) => $page->where('voters.data.0.can_unverify', false));

    $this->deleteJson(route('plk.unverify', $voter))->assertForbidden();
    expect($voter->fresh()->plk_verified_at)->not->toBeNull();
    $this->assertDatabaseHas('pemilih_records', [
        'id' => $voter->id,
        'plk_verified_by' => $verifier->id,
        'plk_verification_status' => 'maklumat_sah',
        'plk_verification_remark' => 'Semakan asal.',
    ]);
});

it('does not allow rollback of an unverified PLK voter', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = createPlkRecord();

    $this->actingAs($user)->get(route('plk.index'))
        ->assertOk()->assertInertia(fn ($page) => $page->where('voters.data.0.can_unverify', false));
    $this->deleteJson(route('plk.unverify', $voter))->assertForbidden();
});

it('exports all matching PLK voters without pagination', function () {
    $user = User::factory()->withModules(['plk'])->create();
    createPlkRecord(['identity_number' => 'PLK-EXPORT-A-1', 'name' => 'PEMILIH EXPORT A', 'dm' => 'UDM A', 'locality' => 'LOKALITI 1', 'cula_code' => '3B', 'catatan' => 'Bawa dokumen']);
    createPlkRecord(['identity_number' => 'PLK-EXPORT-A-2', 'name' => 'PEMILIH EXPORT B', 'dm' => 'UDM A', 'locality' => 'LOKALITI 2', 'cula_code' => '3D']);
    createPlkRecord(['identity_number' => 'PLK-EXPORT-B-1', 'name' => 'PEMILIH EXPORT C', 'dm' => 'UDM B', 'locality' => 'LOKALITI 1', 'cula_code' => '3P']);
    createPlkRecord(['identity_number' => 'PLK-EXPORT-NON-PLK', 'cula_code' => '2']);

    $this->actingAs($user)
        ->getJson(route('plk.export'))
        ->assertOk()
        ->assertJsonCount(3, 'voters')
        ->assertJsonPath('voters.0.dm', 'UDM A')
        ->assertJsonPath('voters.0.locality', 'LOKALITI 1')
        ->assertJsonPath('voters.0.catatan', 'Bawa dokumen');

    $this->actingAs($user)
        ->getJson(route('plk.export', ['udm' => 'UDM B', 'cula_code' => '3P']))
        ->assertOk()
        ->assertJsonCount(1, 'voters')
        ->assertJsonPath('voters.0.name', 'PEMILIH EXPORT C');
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

it('builds all-UDM cards with counts for every PLK code', function () {
    $user = User::factory()->withModules(['plk'])->create();
    createPlkRecord(['identity_number' => 'PLK-CARD-A-1', 'dm' => 'UDM A', 'cula_code' => '3B']);
    createPlkRecord(['identity_number' => 'PLK-CARD-A-2', 'dm' => 'UDM A', 'cula_code' => '3B']);
    createPlkRecord(['identity_number' => 'PLK-CARD-A-3', 'dm' => 'UDM A', 'cula_code' => '3D']);
    createPlkRecord(['identity_number' => 'PLK-CARD-B-1', 'dm' => 'UDM B', 'cula_code' => '3P']);
    createPlkRecord(['identity_number' => 'PEMILIH-UDM-C', 'dm' => 'UDM C', 'cula_code' => '2']);

    $this->actingAs($user)
        ->get(route('plk.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.show_voters', false)
            ->where('udm_cula_counts', function ($rows) {
                $byUdm = collect($rows)->keyBy('udm');

                return $byUdm->get('UDM A')['total'] === 3
                    && $byUdm->get('UDM A')['counts']['3B'] === 2
                    && $byUdm->get('UDM A')['counts']['3D'] === 1
                    && $byUdm->get('UDM B')['total'] === 1
                    && $byUdm->get('UDM B')['counts']['3P'] === 1
                    && $byUdm->get('UDM C')['total'] === 0;
            }));
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
            ->where('badgeCounts.plkBelumSemak', 1)
            ->where('voters.total', 1)
            ->where('voters.data.0.id', $inScope->id));

    $this->actingAs($user)
        ->postJson(route('plk.verify', $outsideScope))
        ->assertForbidden();
});

it('automatically selects the assigned UDM for UDM-level PLK users', function () {
    $user = User::factory()->withModules(['plk'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM A',
    ]);
    $inScope = createPlkRecord(['name' => 'DALAM UDM', 'dm' => 'UDM A']);
    createPlkRecord(['name' => 'LUAR UDM', 'dm' => 'UDM B']);

    $this->actingAs($user)
        ->get(route('plk.index', ['udm' => 'UDM B']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.udm', 'UDM A')
            ->where('udms', ['UDM A'])
            ->where('summary.total', 1)
            ->where('voters.total', 1)
            ->where('voters.data.0.id', $inScope->id));
});

it('restricts the PLK cost tab and rate updates to separately authorized users', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $rates = ['3B' => 10, '3D' => 5.5, '3K' => 0, '3M' => 0, '3P' => 0, '3U' => 20];
    Setting::setValue('plk_rates', json_encode($rates, JSON_THROW_ON_ERROR));
    createPlkRecord();

    $this->actingAs($user)
        ->get(route('plk.index', ['tab' => 'kos']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('active_tab', 'senarai')
            ->where('can_view_costs', false)
            ->where('rates', [])
            ->where('cost_rows', []));

    $this->actingAs($user)
        ->putJson(route('plk.rates.update'), ['rates' => $rates])
        ->assertForbidden();

    $authorizedUser = User::factory()->withModules(['plk', 'plk-kos'])->create();
    $this->actingAs($authorizedUser)
        ->get(route('plk.index', ['tab' => 'kos']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('active_tab', 'kos')
            ->where('can_view_costs', true)
            ->where('rates.3B', 10)
            ->where('cost_rows.0.udm', 'UDM A'));
});

it('saves per-code rates and calculates totals by UDM', function () {
    $user = User::factory()->withModules(['plk', 'plk-kos'])->create();
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
