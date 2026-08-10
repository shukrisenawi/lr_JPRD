<?php

use App\Models\PemilihRecord;
use App\Models\Program;
use App\Models\ProgramGroup;
use App\Models\User;
use App\Services\HashtagService;

it('syncs a program sub program to the voter central hashtags', function () {
    $user = User::factory()->withModules(['dashboard', 'program'])->create();
    $group = ProgramGroup::query()->create([
        'name' => 'Program Hashtag',
        'user_id' => $user->id,
    ]);
    $program = Program::query()->create([
        'tajuk' => 'Program Belia',
        'tempat' => 'Dewan',
        'tarikh' => '2026-08-10',
        'group_id' => $group->id,
        'user_id' => $user->id,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '900808025501',
        'no_kp' => '900808025501',
        'name' => 'PEMILIH PROGRAM BELIA',
        'dm' => 'UDM PROGRAM',
        'locality' => 'LOKALITI PROGRAM',
        'status' => 'aktif',
        'cula_code' => '?',
    ]);

    $this->actingAs($user)
        ->post(route('program.sub-programs.store', $program), [
            'name' => 'Belia Aktif',
        ])
        ->assertRedirect();

    $subProgram = $program->subPrograms()->sole();

    $this->actingAs($user)
        ->post(route('program.attendees.store', $program), [
            'voter_id' => (string) $voter->id,
            'name' => $voter->name,
            'no_kp' => $voter->no_kp,
            'sub_program_ids' => [$subProgram->id],
        ])
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    $this->assertDatabaseHas('hashtags', ['name' => '#belia_aktif']);
    expect($voter->fresh()->hashtags()->pluck('name')->all())->toBe(['#belia_aktif']);

    $hashtagId = $voter->fresh()->hashtags()->sole()->id;
    $this->assertDatabaseHas('hashtag_pemilih_record', [
        'hashtag_id' => $hashtagId,
        'pemilih_record_id' => $voter->id,
        'is_manual' => false,
        'is_program' => true,
    ]);

    $attendee = $program->attendees()->sole();
    $this->actingAs($user)
        ->put(route('program.attendees.sub-programs.update', [$program, $attendee]), [
            'sub_program_ids' => [],
        ])
        ->assertRedirect(route('program.index', ['program' => $program->id]));

    expect($voter->fresh()->hashtags()->count())->toBe(0);
});

it('backfills existing program sub program assignments into central hashtags', function () {
    $user = User::factory()->create();
    $group = ProgramGroup::query()->create([
        'name' => 'Program Lama',
        'user_id' => $user->id,
    ]);
    $program = Program::query()->create([
        'tajuk' => 'Program Sedia Ada',
        'tempat' => 'Dewan Lama',
        'tarikh' => '2026-08-09',
        'group_id' => $group->id,
        'user_id' => $user->id,
    ]);
    $voter = PemilihRecord::query()->create([
        'identity_number' => '900808025504',
        'no_kp' => '900808025504',
        'name' => 'PEMILIH PROGRAM LAMA',
        'status' => 'aktif',
    ]);
    $subProgram = $program->subPrograms()->create(['name' => 'usahawan_muda']);
    $attendee = $program->attendees()->create([
        'user_id' => $user->id,
        'voter_id' => (string) $voter->id,
        'name' => $voter->name,
        'attended_at' => now(),
    ]);
    $attendee->subPrograms()->attach($subProgram);

    $migration = require database_path('migrations/2026_08_10_120000_sync_program_sub_programs_to_hashtags.php');
    $migration->up();

    expect($voter->fresh()->hashtags()->pluck('name')->all())->toBe(['#usahawan_muda']);
});

it('filters Culaan Bot and VCC with the same voter hashtag data', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan-bot', 'vcc'])->create();
    $match = PemilihRecord::query()->create([
        'identity_number' => '900808025502',
        'no_kp' => '900808025502',
        'name' => 'PEMILIH HASHTAG SAMA',
        'dm' => 'UDM HASHTAG SAMA',
        'locality' => 'LOKALITI HASHTAG SAMA',
        'phone_mobile' => '0123456789',
        'status' => 'aktif',
        'cula_code' => '?',
    ]);
    PemilihRecord::query()->create([
        'identity_number' => '900808025503',
        'no_kp' => '900808025503',
        'name' => 'PEMILIH TANPA HASHTAG SAMA',
        'dm' => 'UDM HASHTAG SAMA',
        'locality' => 'LOKALITI HASHTAG SAMA',
        'phone_mobile' => '0198765432',
        'status' => 'aktif',
        'cula_code' => '?',
    ]);
    $otherTagged = PemilihRecord::query()->create([
        'identity_number' => '900808025505',
        'no_kp' => '900808025505',
        'name' => 'PEMILIH HASHTAG LAIN',
        'dm' => 'UDM HASHTAG SAMA',
        'locality' => 'LOKALITI HASHTAG SAMA',
        'phone_mobile' => '0187654321',
        'status' => 'aktif',
        'cula_code' => '?',
    ]);

    app(HashtagService::class)->attach($match, ['#program_sama', '#hashtag_seiring']);
    app(HashtagService::class)->attach($otherTagged, ['#hashtag_lain']);

    $this->actingAs($user)
        ->get(route('culaan-bot.index', [
            'udm' => 'UDM HASHTAG SAMA',
            'hashtags' => ['#program_sama'],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.hashtags', ['#program_sama'])
            ->where('available_hashtags', ['#hashtag_lain', '#hashtag_seiring', '#program_sama'])
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $match->id));

    $this->actingAs($user)
        ->getJson(route('culaan-bot.search', [
            'q' => 'PEMILIH',
            'hashtags' => ['#program_sama'],
        ]))
        ->assertOk()
        ->assertJsonCount(1, 'suggestions')
        ->assertJsonPath('suggestions.0.id', $match->id);

    $this->actingAs($user)
        ->get(route('vcc.index', [
            'udm' => 'UDM HASHTAG SAMA',
            'bulan_lahir' => '',
            'has_phone' => false,
            'per_udm_count' => '',
            'hashtags' => ['#program_sama'],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.hashtags', ['#program_sama'])
            ->where('available_hashtags', ['#hashtag_lain', '#hashtag_seiring', '#program_sama'])
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $match->id));

    $this->actingAs($user)
        ->getJson(route('vcc.search', [
            'q' => 'PEMILIH',
            'bulan_lahir' => '',
            'has_phone' => false,
            'hashtags' => ['#program_sama'],
        ]))
        ->assertOk()
        ->assertJsonCount(1, 'suggestions')
        ->assertJsonPath('suggestions.0.id', $match->id);

    $this->actingAs($user)
        ->getJson(route('vcc.search', [
            'all' => true,
            'bulan_lahir' => '',
            'has_phone' => false,
            'hashtags' => ['#program_sama'],
        ]))
        ->assertOk()
        ->assertJsonCount(1, 'voters')
        ->assertJsonPath('voters.0.id', $match->id);
});
