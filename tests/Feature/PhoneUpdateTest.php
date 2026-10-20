<?php

use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function phoneUpdateVoter(array $attributes = []): PemilihRecord
{
    return PemilihRecord::create(array_merge([
        'identity_number' => '900101025555', 'no_kp' => '900101025555',
        'name' => 'UJIAN TELEFON', 'dm' => 'UDM A', 'locality' => 'LOKALITI A',
        'status' => 'aktif', 'phone_mobile' => '0123456789',
    ], $attributes));
}

it('updates and normalizes a phone from every supported module', function (string $module) {
    $user = User::factory()->withModules([$module])->create();
    $voter = phoneUpdateVoter();
    $this->actingAs($user)->putJson(route('pemilih.phone.update'), [
        'identity' => $voter->no_kp, 'phone' => '+60 19-8887777',
    ])->assertOk()
        ->assertJsonPath('record_id', $voter->id)
        ->assertJsonPath('phone_mobile', '0198887777');
    expect($voter->fresh()->phone_mobile)->toBe('0198887777');
})->with(['carian-pemilih', 'culaan.senarai', 'culaan-bot', 'vcc', 'plk', 'program', 'keluarga-pemilih', 'jawatankuasa.ajk-bukan-pas', 'pusat-khidmat']);

it('returns the voter name for the modal and respects scope', function () {
    $voter = phoneUpdateVoter();
    $this->actingAs(User::factory()->withModules(['vcc'])->create())
        ->getJson(route('pemilih.phone.show', ['identity' => $voter->no_kp]))
        ->assertOk()->assertExactJson(['name' => 'UJIAN TELEFON']);
    $this->actingAs(User::factory()->withModules(['vcc'])->create(['access_level' => 'udm', 'scope_key' => 'UDM B']))
        ->getJson(route('pemilih.phone.show', ['identity' => $voter->no_kp]))->assertForbidden();
});

it('requires authentication module access and voter scope', function () {
    $voter = phoneUpdateVoter();
    $payload = ['identity' => $voter->no_kp, 'phone' => '0198887777'];
    $this->putJson(route('pemilih.phone.update'), $payload)->assertUnauthorized();
    $this->actingAs(User::factory()->withModules(['dashboard'])->create())
        ->putJson(route('pemilih.phone.update'), $payload)->assertForbidden();
    $this->actingAs(User::factory()->withModules(['vcc'])->create(['access_level' => 'udm', 'scope_key' => 'UDM B']))
        ->putJson(route('pemilih.phone.update'), $payload)->assertForbidden();
    expect($voter->fresh()->phone_mobile)->toBe('0123456789');
});

it('rejects malformed phone input without changing the record', function (string $phone) {
    $voter = phoneUpdateVoter();
    $this->actingAs(User::factory()->withModules(['vcc'])->create())
        ->putJson(route('pemilih.phone.update'), ['identity' => $voter->no_kp, 'phone' => $phone])
        ->assertUnprocessable()->assertJsonValidationErrors('phone');
    expect($voter->fresh()->phone_mobile)->toBe('0123456789');
})->with(['', 'abc0123456789', '123', str_repeat('1', 16)]);

it('supports old identity numbers and removes obsolete verification without verifying the replacement', function () {
    $voter = phoneUpdateVoter(['no_kp' => null, 'old_ic' => 'A1234567']);
    $user = User::factory()->withModules(['plk'])->create();
    DB::table('phone_verifications')->insert([
        'phone' => '0123456789', 'pemilih_record_id' => $voter->id,
        'verified_by' => $user->id, 'is_valid' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $this->actingAs($user)->putJson(route('pemilih.phone.update'), ['identity' => 'A1234567', 'phone' => '0198887777'])->assertOk();
    $this->assertDatabaseCount('phone_verifications', 0);
});

it('does not update inactive voters', function () {
    $voter = phoneUpdateVoter(['status' => 'tidak_aktif']);
    $this->actingAs(User::factory()->withModules(['vcc'])->create())
        ->putJson(route('pemilih.phone.update'), ['identity' => $voter->no_kp, 'phone' => '0198887777'])->assertNotFound();
});
