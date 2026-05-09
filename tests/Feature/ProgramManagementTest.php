<?php

use App\Models\Program;
use App\Models\Setting;
use App\Models\User;

function programPemilihFixture(): string
{
    return <<<'HTML'
<html><body><table>
<tr><th>Bil.</th><th>Kod DM</th><th>Nama DM</th><th>Kod Lokaliti</th><th>Nama Lokaliti</th><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th><th>Alamat Kediaman</th><th>Tel. Rumah</th><th>Tel. Bimbit</th></tr>
<tr><td>1</td><td>="01"</td><td>PADANG CHICHAK</td><td>="001"</td><td>KG BARU KURA</td><td>="900101025555"</td><td>ALI BIN ABU</td><td>L</td><td>M</td><td>2</td><td>KG BARU KURA</td><td>="049999999"</td><td>="0123456789"</td></tr>
<tr><td>2</td><td>="02"</td><td>KAMPUNG BETONG</td><td>="002"</td><td>KG BETONG</td><td>="880808025333"</td><td>SITI AMINAH</td><td>P</td><td>M</td><td>3P</td><td>KG BETONG</td><td>="047777777"</td><td>="0198888777"</td></tr>
</table></body></html>
HTML;
}

it('renders program page for authenticated user with program module access', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $this->actingAs($user)
        ->get(route('program.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Program/Index')
            ->where('programs', []));
});

it('allows authorized user to create a new program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $this->actingAs($user)
        ->post(route('program.store'), [
            'tajuk' => 'Program Ramah Mesra',
            'tempat' => 'Dewan Orang Ramai',
            'tarikh' => '2026-05-09',
            'masa' => '20:30',
        ])
        ->assertRedirect(route('program.index', ['program' => 1]));

    $program = Program::query()->where('tajuk', 'Program Ramah Mesra')->first();

    expect($program)->not->toBeNull()
        ->and($program->tempat)->toBe('Dewan Orang Ramai')
        ->and($program->tarikh?->format('Y-m-d'))->toBe('2026-05-09')
        ->and($program->masa?->format('H:i'))->toBe('20:30');
});

it('allows authorized user to create a new program without masa', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $response = $this->actingAs($user)
        ->post(route('program.store'), [
            'tajuk' => 'Program Tanpa Masa',
            'tempat' => 'Dewan Komuniti',
            'tarikh' => '2026-05-12',
            'masa' => '',
        ]);

    $response->assertSessionDoesntHaveErrors('masa');
    $response->assertRedirect(route('program.index', ['program' => 1]));

    $program = Program::query()->where('tajuk', 'Program Tanpa Masa')->first();

    expect($program)->not->toBeNull()
        ->and($program->tempat)->toBe('Dewan Komuniti')
        ->and($program->tarikh?->format('Y-m-d'))->toBe('2026-05-12')
        ->and($program->masa)->toBeNull();
});

it('allows authorized user to update an existing program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Padang Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->put(route('program.update', $program), [
            'tajuk' => 'Program Belia Dikemas Kini',
            'tempat' => 'Dewan Serbaguna',
            'tarikh' => '2026-05-11',
            'masa' => '10:30',
        ])
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $program->refresh();

    expect($program->tajuk)->toBe('Program Belia Dikemas Kini')
        ->and($program->tempat)->toBe('Dewan Serbaguna')
        ->and($program->tarikh?->format('Y-m-d'))->toBe('2026-05-11')
        ->and($program->masa?->format('H:i'))->toBe('10:30');
});

it('allows authorized user to delete an existing program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Padang Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $user->id,
    ]);

    $program->attendees()->create([
        'voter_id' => 'sha1-ali',
        'name' => 'ALI BIN ABU',
        'no_kp' => '900101025555',
        'old_ic' => '',
        'phone_mobile' => '0123456789',
        'phone_home' => '049999999',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'gender' => 'L',
        'race' => 'M',
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
        'address' => 'KG BARU KURA',
        'attended_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('program.destroy', $program))
        ->assertRedirect(route('program.index'));

    $this->assertDatabaseMissing('programs', [
        'id' => $program->id,
    ]);

    $this->assertDatabaseMissing('program_attendees', [
        'program_id' => $program->id,
        'voter_id' => 'sha1-ali',
    ]);
});

it('returns voter suggestions for selected program search', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $path = storage_path('app/testing-program-pemilih-search.xls');
    file_put_contents($path, programPemilihFixture());
    Setting::setValue('pemilih_report_file_path', $path);

    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Padang Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->getJson(route('program.search', $program).'?q=ali')
        ->assertOk()
        ->assertJsonPath('suggestions.0.voter_id', fn ($value) => is_string($value) && $value !== '')
        ->assertJsonPath('suggestions.0.name', 'ALI BIN ABU')
        ->assertJsonPath('suggestions.0.no_kp', '900101025555');
});

it('allows authorized user to add voter attendance into a program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Padang Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $user->id,
    ]);

    $payload = [
        'voter_id' => 'sha1-ali',
        'name' => 'ALI BIN ABU',
        'no_kp' => '900101025555',
        'old_ic' => '',
        'phone_mobile' => '0123456789',
        'phone_home' => '049999999',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'gender' => 'L',
        'race' => 'M',
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
        'address' => 'KG BARU KURA',
    ];

    $this->actingAs($user)
        ->post(route('program.attendees.store', $program), $payload)
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $this->assertDatabaseHas('program_attendees', [
        'program_id' => $program->id,
        'voter_id' => 'sha1-ali',
        'name' => 'ALI BIN ABU',
        'no_kp' => '900101025555',
    ]);
});

it('allows authorized user to add voter attendance using payload from program search results', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $path = storage_path('app/testing-program-pemilih-attendance-search.xls');
    file_put_contents($path, programPemilihFixture());
    Setting::setValue('pemilih_report_file_path', $path);

    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Padang Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $user->id,
    ]);

    $searchPayload = $this->actingAs($user)
        ->getJson(route('program.search', $program).'?q=ali')
        ->assertOk()
        ->json('suggestions.0');

    $this->actingAs($user)
        ->post(route('program.attendees.store', $program), $searchPayload)
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $this->assertDatabaseHas('program_attendees', [
        'program_id' => $program->id,
        'name' => 'ALI BIN ABU',
        'no_kp' => '900101025555',
    ]);
});

it('allows authorized user to delete attendee from a program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Padang Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $user->id,
    ]);

    $attendee = $program->attendees()->create([
        'voter_id' => 'sha1-ali',
        'name' => 'ALI BIN ABU',
        'no_kp' => '900101025555',
        'old_ic' => '',
        'phone_mobile' => '0123456789',
        'phone_home' => '049999999',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'gender' => 'L',
        'race' => 'M',
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
        'address' => 'KG BARU KURA',
        'attended_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('program.attendees.destroy', [$program, $attendee]))
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $this->assertDatabaseMissing('program_attendees', [
        'id' => $attendee->id,
        'program_id' => $program->id,
    ]);
});

it('blocks program route when user role does not have program module access', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('program.index'))
        ->assertForbidden();
});
