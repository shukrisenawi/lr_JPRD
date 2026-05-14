<?php

use App\Models\Program;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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

function createProgramGroupFor(User $user, string $name = 'Zon Ujian'): \App\Models\ProgramGroup
{
    return \App\Models\ProgramGroup::query()->create([
        'name' => $name,
        'user_id' => $user->id,
    ]);
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

it('allows authorized user to create, update, and delete a group program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $this->actingAs($user)
        ->post(route('program.groups.store'), [
            'name' => 'Zon Utara',
        ])
        ->assertRedirect(route('program.index'));

    $groupId = \App\Models\ProgramGroup::query()->where('name', 'Zon Utara')->value('id');

    expect($groupId)->not->toBeNull();

    $this->actingAs($user)
        ->put(route('program.groups.update', $groupId), [
            'name' => 'Zon Utara Baharu',
        ])
        ->assertRedirect(route('program.index'));

    $this->assertDatabaseHas('program_groups', [
        'id' => $groupId,
        'name' => 'Zon Utara Baharu',
        'user_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->delete(route('program.groups.destroy', $groupId))
        ->assertRedirect(route('program.index'));

    $this->assertDatabaseMissing('program_groups', [
        'id' => $groupId,
    ]);
});

it('allows authorized user to assign group program when creating a program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $group = createProgramGroupFor($user, 'Zon Selatan');

    $this->actingAs($user)
        ->post(route('program.store'), [
            'tajuk' => 'Program Berkelompok',
            'tempat' => 'Dewan Orang Ramai',
            'tarikh' => '2026-05-09',
            'masa' => '20:30',
            'group_id' => $group->id,
        ])
        ->assertRedirect(route('program.index', ['program' => 1]));

    $this->assertDatabaseHas('programs', [
        'tajuk' => 'Program Berkelompok',
        'group_id' => $group->id,
        'user_id' => $user->id,
    ]);
});

it('allows authorized user to create a new program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $group = createProgramGroupFor($user);

    $this->actingAs($user)
        ->post(route('program.store'), [
            'tajuk' => 'Program Ramah Mesra',
            'tempat' => 'Dewan Orang Ramai',
            'tarikh' => '2026-05-09',
            'masa' => '20:30',
            'group_id' => $group->id,
        ])
        ->assertRedirect(route('program.index', ['program' => 1]));

    $program = Program::query()->where('tajuk', 'Program Ramah Mesra')->first();

    expect($program)->not->toBeNull()
        ->and($program->tempat)->toBe('Dewan Orang Ramai')
        ->and($program->tarikh?->format('Y-m-d'))->toBe('2026-05-09')
        ->and($program->masa?->format('H:i'))->toBe('20:30');
});

it('allows authorized user to create a new program with gambar', function () {
    Storage::fake('public');
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $group = createProgramGroupFor($user);
    $gambar = UploadedFile::fake()->create('program.jpg', 120, 'image/jpeg');

    $this->actingAs($user)
        ->post(route('program.store'), [
            'tajuk' => 'Program Bergambar',
            'tempat' => 'Dewan Orang Ramai',
            'tarikh' => '2026-05-09',
            'masa' => '20:30',
            'group_id' => $group->id,
            'gambar' => $gambar,
        ])
        ->assertRedirect(route('program.index', ['program' => 1]));

    $program = Program::query()->where('tajuk', 'Program Bergambar')->first();

    expect($program)->not->toBeNull()
        ->and($program->gambar)->not->toBeNull();

    Storage::disk('public')->assertExists($program->gambar);
});

it('allows authorized user to view uploaded gambar program', function () {
    Storage::fake('public');
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $gambarPath = UploadedFile::fake()->create('program.jpg', 120, 'image/jpeg')
        ->store('programs', 'public');

    $program = Program::query()->create([
        'tajuk' => 'Program Bergambar',
        'tempat' => 'Dewan Orang Ramai',
        'tarikh' => '2026-05-09',
        'masa' => '20:30',
        'gambar' => $gambarPath,
        'user_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->get(route('program.gambar', $program))
        ->assertOk();
});

it('requires group program when creating a new program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();

    $response = $this->actingAs($user)
        ->post(route('program.store'), [
            'tajuk' => 'Program Tanpa Group',
            'tempat' => 'Dewan Komuniti',
            'tarikh' => '2026-05-12',
            'masa' => '20:00',
            'group_id' => '',
        ]);

    $response->assertSessionHasErrors('group_id');
});

it('allows authorized user to create a new program without masa', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $group = createProgramGroupFor($user);

    $response = $this->actingAs($user)
        ->post(route('program.store'), [
            'tajuk' => 'Program Tanpa Masa',
            'tempat' => 'Dewan Komuniti',
            'tarikh' => '2026-05-12',
            'masa' => '',
            'group_id' => $group->id,
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
    $group = createProgramGroupFor($user, 'Zon Lama');
    $updatedGroup = createProgramGroupFor($user, 'Zon Baru');

    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Padang Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'group_id' => $group->id,
        'user_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->put(route('program.update', $program), [
            'tajuk' => 'Program Belia Dikemas Kini',
            'tempat' => 'Dewan Serbaguna',
            'tarikh' => '2026-05-11',
            'masa' => '10:30',
            'group_id' => $updatedGroup->id,
        ])
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $program->refresh();

    expect($program->tajuk)->toBe('Program Belia Dikemas Kini')
        ->and($program->tempat)->toBe('Dewan Serbaguna')
        ->and($program->tarikh?->format('Y-m-d'))->toBe('2026-05-11')
        ->and($program->masa?->format('H:i'))->toBe('10:30');
});

it('allows authorized user to replace gambar for an existing program', function () {
    Storage::fake('public');
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $group = createProgramGroupFor($user);
    $oldImage = UploadedFile::fake()->create('lama.jpg', 120, 'image/jpeg');
    $newImage = UploadedFile::fake()->create('baru.jpg', 120, 'image/jpeg');

    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Padang Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'group_id' => $group->id,
        'gambar' => $oldImage->store('programs', 'public'),
        'user_id' => $user->id,
    ]);

    $oldPath = $program->gambar;

    $this->actingAs($user)
        ->put(route('program.update', $program), [
            'tajuk' => 'Program Belia',
            'tempat' => 'Padang Awam',
            'tarikh' => '2026-05-10',
            'masa' => '09:00',
            'group_id' => $group->id,
            'gambar' => $newImage,
        ])
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $program->refresh();

    expect($program->gambar)->not->toBe($oldPath);
    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($program->gambar);
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

it('shows attendee group badges and participation counts on selected program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $groupA = createProgramGroupFor($user, 'Zon Alpha');
    $groupB = createProgramGroupFor($user, 'Zon Beta');

    $programA = Program::query()->create([
        'tajuk' => 'Program Alpha 1',
        'tempat' => 'Dewan A',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'group_id' => $groupA->id,
        'user_id' => $user->id,
    ]);

    $programB = Program::query()->create([
        'tajuk' => 'Program Alpha 2',
        'tempat' => 'Dewan B',
        'tarikh' => '2026-05-11',
        'masa' => '10:00',
        'group_id' => $groupA->id,
        'user_id' => $user->id,
    ]);

    $programC = Program::query()->create([
        'tajuk' => 'Program Beta 1',
        'tempat' => 'Dewan C',
        'tarikh' => '2026-05-12',
        'masa' => '11:00',
        'group_id' => $groupB->id,
        'user_id' => $user->id,
    ]);

    foreach ([$programA, $programB, $programC] as $programItem) {
        $programItem->attendees()->create([
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
    }

    $this->actingAs($user)
        ->get(route('program.index', ['program' => $programA->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedProgram.attendees.0.group_badges.0.name', 'Zon Alpha')
            ->where('selectedProgram.attendees.0.group_badges.0.count', 2)
            ->where('selectedProgram.attendees.0.group_badges.1.name', 'Zon Beta')
            ->where('selectedProgram.attendees.0.group_badges.1.count', 1)
            ->where('selectedProgram.attendees.0.joined_programs.0.tajuk', fn ($value) => is_string($value) && $value !== ''));
});

it('shows attendee jawatankuasa badges on selected program', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $group = createProgramGroupFor($user, 'Zon Alpha');

    $program = Program::query()->create([
        'tajuk' => 'Program Dengan Jawatankuasa',
        'tempat' => 'Dewan A',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'group_id' => $group->id,
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

    $voter = \App\Models\PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BIN ABU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
    ]);

    $position = \App\Models\CommitteePosition::query()->create([
        'name' => 'Pengerusi',
        'slug' => 'pengerusi',
        'sort_order' => 1,
    ]);

    \App\Models\CommitteeMembership::query()->create([
        'pemilih_record_id' => $voter->id,
        'committee_position_id' => $position->id,
        'level' => 'udm',
        'scope_key' => 'PADANG CHICHAK',
        'scope_name' => 'PADANG CHICHAK',
        'parent_scope_name' => null,
    ]);

    $this->actingAs($user)
        ->get(route('program.index', ['program' => $program->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedProgram.attendees.0.committee_badges.0.label', 'Pengerusi')
            ->where('selectedProgram.attendees.0.committee_badges.0.level', 'udm')
            ->where('selectedProgram.attendees.0.committee_badges.0.scope_name', 'PADANG CHICHAK'));
});

it('allows owner to share a program with selected authorized users', function () {
    $owner = User::factory()->withModules(['dashboard', 'program'])->create();
    $sharedUser = User::factory()->withModules(['dashboard', 'program'])->create();
    $secondSharedUser = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Perkongsian',
        'tempat' => 'Dewan Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $owner->id,
    ]);

    $this->from(route('program.index'))
        ->actingAs($owner)
        ->post(route('program.share.store', $program), [
            'shared_user_ids' => [$sharedUser->id, $secondSharedUser->id],
        ])
        ->assertRedirect(route('program.index'));

    $this->assertDatabaseHas('program_user_shares', [
        'program_id' => $program->id,
        'user_id' => $sharedUser->id,
    ]);

    $this->assertDatabaseHas('program_user_shares', [
        'program_id' => $program->id,
        'user_id' => $secondSharedUser->id,
    ]);
});

it('owner can update checkbox share list and remove unchecked users', function () {
    $owner = User::factory()->withModules(['dashboard', 'program'])->create();
    $sharedUser = User::factory()->withModules(['dashboard', 'program'])->create();
    $secondSharedUser = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Perkongsian',
        'tempat' => 'Dewan Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $owner->id,
    ]);

    $program->sharedUsers()->attach([$sharedUser->id, $secondSharedUser->id]);

    $this->from(route('program.index'))
        ->actingAs($owner)
        ->post(route('program.share.store', $program), [
            'shared_user_ids' => [$secondSharedUser->id],
        ])
        ->assertRedirect(route('program.index'));

    $this->assertDatabaseMissing('program_user_shares', [
        'program_id' => $program->id,
        'user_id' => $sharedUser->id,
    ]);

    $this->assertDatabaseHas('program_user_shares', [
        'program_id' => $program->id,
        'user_id' => $secondSharedUser->id,
    ]);
});

it('includes shared users in program list payload for share modal preselection', function () {
    $owner = User::factory()->withModules(['dashboard', 'program'])->create();
    $sharedUser = User::factory()->withModules(['dashboard', 'program'])->create();
    $secondSharedUser = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Perkongsian',
        'tempat' => 'Dewan Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $owner->id,
    ]);

    $program->sharedUsers()->attach([$sharedUser->id, $secondSharedUser->id]);

    $this->actingAs($owner)
        ->get(route('program.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('programs.0.id', $program->id)
            ->where('programs.0.shared_users.0.id', $sharedUser->id)
            ->where('programs.0.shared_users.0.name', $sharedUser->name)
            ->where('programs.0.shared_users.1.id', $secondSharedUser->id)
            ->where('programs.0.shared_users.1.name', $secondSharedUser->name));
});

it('shows shared program to shared user and hides program edit access', function () {
    $owner = User::factory()->withModules(['dashboard', 'program'])->create();
    $sharedUser = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Dikongsi',
        'tempat' => 'Dewan Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $owner->id,
    ]);

    $program->sharedUsers()->attach($sharedUser->id);

    $this->actingAs($sharedUser)
        ->get(route('program.index', ['program' => $program->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('programs.0.id', $program->id)
            ->where('programs.0.can_edit', false)
            ->where('selectedProgram.id', $program->id)
            ->where('selectedProgram.can_edit', false));
});

it('allows shared user to add and delete attendee for shared program', function () {
    $owner = User::factory()->withModules(['dashboard', 'program'])->create();
    $sharedUser = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Dikongsi',
        'tempat' => 'Dewan Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $owner->id,
    ]);

    $program->sharedUsers()->attach($sharedUser->id);

    $payload = [
        'voter_id' => 'sha1-kongsi',
        'name' => 'PENGUNDI KONGSI',
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

    $this->actingAs($sharedUser)
        ->post(route('program.attendees.store', $program), $payload)
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $attendee = $program->attendees()->where('voter_id', 'sha1-kongsi')->first();

    expect($attendee)->not->toBeNull();

    $this->actingAs($sharedUser)
        ->delete(route('program.attendees.destroy', [$program, $attendee]))
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $this->assertDatabaseMissing('program_attendees', [
        'id' => $attendee->id,
    ]);
});

it('blocks shared user from updating or deleting shared program', function () {
    $owner = User::factory()->withModules(['dashboard', 'program'])->create();
    $sharedUser = User::factory()->withModules(['dashboard', 'program'])->create();

    $program = Program::query()->create([
        'tajuk' => 'Program Dikongsi',
        'tempat' => 'Dewan Awam',
        'tarikh' => '2026-05-10',
        'masa' => '09:00',
        'user_id' => $owner->id,
    ]);

    $program->sharedUsers()->attach($sharedUser->id);

    $this->actingAs($sharedUser)
        ->put(route('program.update', $program), [
            'tajuk' => 'Tak Sepatutnya Berjaya',
            'tempat' => 'Dewan Serbaguna',
            'tarikh' => '2026-05-11',
            'masa' => '10:30',
        ])
        ->assertRedirect(route('login'));

    $this->actingAs($sharedUser)
        ->delete(route('program.destroy', $program))
        ->assertRedirect(route('login'));
});

it('blocks program route when user role does not have program module access', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('program.index'))
        ->assertRedirect(route('login'));
});
