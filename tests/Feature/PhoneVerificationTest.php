<?php

use App\Models\PemilihRecord;
use App\Models\User;
use App\Services\PemilihReportService;
use App\Support\PhoneNumber;
use Illuminate\Support\Str;

function phoneVerificationVoter(array $attributes = []): PemilihRecord
{
    return PemilihRecord::create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'name' => 'UJIAN TELEFON',
        'dm' => 'UDM A',
        'locality' => 'LOKALITI A',
        'status' => 'aktif',
        'cula_code' => '3B',
        'phone_mobile' => '012-3456789',
    ], $attributes));
}

it('verifies and cancels the same phone across PLK and VCC without changing PLK verification', function () {
    $user = User::factory()->withModules(['plk', 'vcc'])->create();
    $voter = phoneVerificationVoter();
    $this->actingAs($user)->put(route('plk.phone-verification', $voter), [
        'phone' => '+60 12-3456789', 'verified' => true,
    ])->assertRedirect();
    $this->assertDatabaseHas('phone_verifications', ['phone' => '0123456789', 'verified_by' => $user->id]);
    expect($voter->fresh()->plk_verified_at)->toBeNull();
    $this->get(route('plk.index'))->assertInertia(fn ($page) => $page->where('verifiedPhones.0', '0123456789'));
    $this->actingAs($user)->put(route('vcc.phone-verification', $voter), [
        'phone' => '0123456789', 'verified' => false,
    ])->assertRedirect();
    $this->assertDatabaseCount('phone_verifications', 0);
});

it('does not duplicate differently formatted phone numbers', function () {
    $user = User::factory()->withModules(['vcc'])->create();
    foreach ([phoneVerificationVoter(), phoneVerificationVoter(['phone_mobile' => '+60123456789'])] as $voter) {
        $this->actingAs($user)->put(route('vcc.phone-verification', $voter), [
            'phone' => $voter->phone_mobile, 'verified' => true,
        ])->assertRedirect();
    }
    $this->assertDatabaseCount('phone_verifications', 1);
});

it('rejects unrelated empty and malformed phone numbers', function () {
    $user = User::factory()->withModules(['plk'])->create();
    $voter = phoneVerificationVoter();
    foreach (['0199999999', '', 'abc', str_repeat('1', 41)] as $phone) {
        $this->actingAs($user)->putJson(route('plk.phone-verification', $voter), [
            'phone' => $phone, 'verified' => true,
        ])->assertUnprocessable();
    }
    $this->assertDatabaseCount('phone_verifications', 0);
});

it('requires the relevant module and respects voter scope', function () {
    $voter = phoneVerificationVoter();
    $user = User::factory()->withModules(['vcc'])->create();
    $this->actingAs($user)->putJson(route('plk.phone-verification', $voter), [
        'phone' => $voter->phone_mobile, 'verified' => true,
    ])->assertForbidden();
    $scoped = User::factory()->withModules(['plk'])->create(['access_level' => 'udm', 'scope_key' => 'UDM B']);
    $this->actingAs($scoped)->putJson(route('plk.phone-verification', $voter), [
        'phone' => $voter->phone_mobile, 'verified' => true,
    ])->assertForbidden();
});

it('normalizes Malaysian country prefixes consistently', function () {
    expect(PhoneNumber::normalize('+60 12-3456789'))->toBe('0123456789')
        ->and(PhoneNumber::normalize('0060123456789'))->toBe('0123456789')
        ->and(PhoneNumber::normalize(null))->toBe('');
});

it('marks a phone invalid and allows correcting it to valid', function () {
    $user = User::factory()->withModules(['plk', 'vcc'])->create();
    $voter = phoneVerificationVoter();
    $this->actingAs($user)->put(route('plk.phone-verification', $voter), [
        'phone' => $voter->phone_mobile, 'verified' => true, 'is_valid' => false,
    ])->assertRedirect();
    $this->assertDatabaseHas('phone_verifications', ['phone' => '0123456789', 'is_valid' => false]);
    $this->get(route('plk.index'))->assertInertia(fn ($page) => $page
        ->where('invalidPhones.0', '0123456789')->where('verifiedPhones', []));

    $this->postJson(route('vcc.communication.call'), ['voter_id' => $voter->id, 'status' => 'support'])->assertOk();
    $this->assertDatabaseHas('phone_verifications', ['phone' => '0123456789', 'is_valid' => false]);

    $this->put(route('plk.phone-verification', $voter), [
        'phone' => $voter->phone_mobile, 'verified' => true, 'is_valid' => false,
    ])->assertRedirect();
    $this->put(route('plk.phone-verification', $voter), [
        'phone' => $voter->phone_mobile, 'verified' => true, 'is_valid' => true,
    ])->assertRedirect();
    $this->get(route('plk.index'))->assertInertia(fn ($page) => $page
        ->where('verifiedPhones.0', '0123456789')->where('invalidPhones', []));
});

it('preserves verified phone status when changing VCC responses', function (string $status) {
    $user = User::factory()->withModules(['vcc'])->create();
    $voter = phoneVerificationVoter();
    $this->actingAs($user)->put(route('vcc.phone-verification', $voter), [
        'phone' => $voter->phone_mobile, 'verified' => true, 'is_valid' => true,
    ])->assertRedirect();
    $this->actingAs($user)->postJson(route('vcc.communication.call'), [
        'voter_id' => $voter->id, 'status' => $status,
    ])->assertOk();
    $this->assertDatabaseHas('phone_verifications', [
        'phone' => '0123456789', 'verified_by' => $user->id, 'is_valid' => true,
    ]);
})->with(['unmarked', 'no_response', 'support', 'oppose', 'other']);

it('does not verify the phone when changing any VCC response', function (string $status) {
    $user = User::factory()->withModules(['vcc'])->create();
    $voter = phoneVerificationVoter();
    $this->actingAs($user)->postJson(route('vcc.communication.call'), [
        'voter_id' => $voter->id, 'status' => $status,
    ])->assertOk();
    $this->assertDatabaseCount('phone_verifications', 0);
})->with(['unmarked', 'no_response', 'support', 'oppose', 'other']);

it('preserves phone status only when an imported number remains the same', function (string $newPhone, bool $retained, bool $isValid) {
    $path = storage_path('app/testing-phone-status-'.Str::uuid().'.xls');
    $writeImport = function (string $phone) use ($path): void {
        file_put_contents($path, '<html><body><table>'
            .'<tr><th>Bil.</th><th>Nama DM</th><th>Nama Lokaliti</th><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Tel. Bimbit</th><th>Kod Cula</th></tr>'
            .'<tr><td>1</td><td>UDM A</td><td>LOKALITI A</td><td>900101025555</td><td>UJIAN IMPORT</td><td>'.htmlspecialchars($phone).'</td><td>3B</td></tr>'
            .'</table></body></html>');
    };

    try {
        $service = app(PemilihReportService::class);
        $writeImport('0123456789');
        $service->syncUploadedVoters($path);
        $voter = PemilihRecord::where('no_kp', '900101025555')->firstOrFail();
        $user = User::factory()->withModules(['plk'])->create();
        $this->actingAs($user)->put(route('plk.phone-verification', $voter), [
            'phone' => '0123456789', 'verified' => true, 'is_valid' => $isValid,
        ])->assertRedirect();

        $writeImport($newPhone);
        $service->syncUploadedVoters($path);
        $this->assertDatabaseCount('phone_verifications', $retained ? 1 : 0);
        if ($retained) {
            $this->assertDatabaseHas('phone_verifications', ['phone' => '0123456789', 'is_valid' => $isValid]);
        }
    } finally {
        if (file_exists($path)) {
            unlink($path);
        }
    }
})->with([
    'same valid' => ['0123456789', true, true],
    'same invalid' => ['0123456789', true, false],
    'formatted valid' => ['+60 12-3456789', true, true],
    'formatted invalid' => ['+60 12-3456789', true, false],
    'changed valid' => ['0199999999', false, true],
    'changed invalid' => ['0199999999', false, false],
    'removed valid' => ['', false, true],
    'removed invalid' => ['', false, false],
]);
