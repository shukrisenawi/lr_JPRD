<?php

use App\Models\CulaWorkItem;
use App\Models\PemilihRecord;
use App\Models\User;

it('renders culaan page for authenticated user with module access', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $this->actingAs($user)
        ->get(route('culaan.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Culaan/Index')
            ->where('filters.udm', '')
            ->where('filters.locality', '')
            ->where('filters.show_marked', false)
            ->where('requires_udm', true)
            ->where('summary.total', 0)
            ->where('voters.data', []));
});

it('blocks culaan route when user role does not have module access', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('culaan.index'))
        ->assertRedirect(route('login'));
});

it('shows empty culaan list until udm is selected', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    PemilihRecord::query()->create([
        'identity_number' => '900101025555',
        'no_kp' => '900101025555',
        'name' => 'ALI BELUM CULA',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    PemilihRecord::query()->create([
        'identity_number' => '900101025556',
        'no_kp' => '900101025556',
        'name' => 'SITI SUDAH CULA',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'aktif',
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
    ]);

    PemilihRecord::query()->create([
        'identity_number' => '900101025557',
        'no_kp' => '900101025557',
        'name' => 'ABU TIDAK AKTIF',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU KURA',
        'status' => 'xaktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)
        ->get(route('culaan.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('requires_udm', true)
            ->where('summary.total', 0)
            ->where('voters.data', []));
});

it('filters culaan voters by udm and locality', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $match = PemilihRecord::query()->create([
        'identity_number' => '900101025558',
        'no_kp' => '900101025558',
        'name' => 'MAT PADANAN',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    PemilihRecord::query()->create([
        'identity_number' => '900101025559',
        'no_kp' => '900101025559',
        'name' => 'MAT LAIN',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI DUA',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    PemilihRecord::query()->create([
        'identity_number' => '900101025560',
        'no_kp' => '900101025560',
        'name' => 'MAT UDM LAIN',
        'dm' => 'UDM BETA',
        'locality' => 'LOKALITI TIGA',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)
        ->get(route('culaan.index', [
            'udm' => 'UDM ALPHA',
            'locality' => 'LOKALITI SATU',
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.udm', 'UDM ALPHA')
            ->where('filters.locality', 'LOKALITI SATU')
            ->where('summary.total', 1)
            ->where('voters.total', 1)
            ->where('voters.per_page', 20)
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $match->id)
            ->where('localities.0', 'LOKALITI SATU')
            ->where('localities.1', 'LOKALITI DUA'));
});

it('returns search suggestions only for active belum cula voters', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $match = PemilihRecord::query()->create([
        'identity_number' => '900101025561',
        'no_kp' => '900101025561',
        'name' => 'CARI ALI',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'phone_mobile' => '0123456789',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    PemilihRecord::query()->create([
        'identity_number' => '900101025562',
        'no_kp' => '900101025562',
        'name' => 'CARI ALI SUDAH',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'phone_mobile' => '0120000000',
        'status' => 'aktif',
        'cula_code' => '3',
        'cula_display_label' => '3 - ATAS PAGAR',
    ]);

    $this->actingAs($user)
        ->getJson(route('culaan.search').'?q=ali&udm=UDM%20ALPHA')
        ->assertOk()
        ->assertJsonCount(1, 'suggestions')
        ->assertJsonPath('suggestions.0.id', $match->id)
        ->assertJsonPath('suggestions.0.name', 'CARI ALI');
});

it('returns empty search suggestions until udm is selected', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    PemilihRecord::query()->create([
        'identity_number' => '900101025566',
        'no_kp' => '900101025566',
        'name' => 'ALI TANPA UDM',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)
        ->getJson(route('culaan.search').'?q=ali')
        ->assertOk()
        ->assertJsonCount(0, 'suggestions');
});

it('hides marked voters from default culaan list and can show them when requested', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025563',
        'no_kp' => '900101025563',
        'name' => 'ALI DITANDA',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)
        ->post(route('culaan.mark.store', $voter))
        ->assertRedirect(route('culaan.index'));

    $this->assertDatabaseHas('cula_work_items', [
        'pemilih_record_id' => $voter->id,
        'marked_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->get(route('culaan.index', ['udm' => 'UDM ALPHA']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 0)
            ->where('voters.data', []));

    $this->actingAs($user)
        ->get(route('culaan.index', ['udm' => 'UDM ALPHA', 'show_marked' => 1]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.show_marked', true)
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $voter->id)
            ->where('voters.data.0.is_marked', true));
});

it('allows unmarking culaan checklist without changing original cula code', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025564',
        'no_kp' => '900101025564',
        'name' => 'ALI BUKA SEMULA',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)
        ->post(route('culaan.mark.store', $voter))
        ->assertRedirect(route('culaan.index'));

    $this->actingAs($user)
        ->delete(route('culaan.mark.destroy', $voter))
        ->assertRedirect(route('culaan.index'));

    $this->assertDatabaseMissing('cula_work_items', [
        'pemilih_record_id' => $voter->id,
    ]);

    expect($voter->fresh()->cula_code)->toBe('?')
        ->and($voter->fresh()->cula_display_label)->toBe('BELUM DICULA');
});

it('returns json response when marking culaan via async request', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025567',
        'no_kp' => '900101025567',
        'name' => 'ALI ASYNC TANDA',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)
        ->postJson(route('culaan.mark.store', $voter))
        ->assertOk()
        ->assertJsonPath('message', 'Pemilih ditanda sebagai sudah diproses.')
        ->assertJsonPath('marked', true)
        ->assertJsonPath('voter_id', $voter->id);
});

it('returns json response when unmarking culaan via async request', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025568',
        'no_kp' => '900101025568',
        'name' => 'ALI ASYNC BUKA',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)->post(route('culaan.mark.store', $voter));

    $this->actingAs($user)
        ->deleteJson(route('culaan.mark.destroy', $voter))
        ->assertOk()
        ->assertJsonPath('message', 'Tanda culaan berjaya dibuka semula.')
        ->assertJsonPath('marked', false)
        ->assertJsonPath('voter_id', $voter->id);
});

it('hides marked voters from default culaan search unless show marked is requested', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025565',
        'no_kp' => '900101025565',
        'name' => 'ALI CARI TANDA',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI SATU',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)
        ->post(route('culaan.mark.store', $voter))
        ->assertRedirect(route('culaan.index'));

    $this->actingAs($user)
        ->getJson(route('culaan.search').'?q=ali&udm=UDM%20ALPHA')
        ->assertOk()
        ->assertJsonCount(0, 'suggestions');

    $this->actingAs($user)
        ->getJson(route('culaan.search').'?q=ali&udm=UDM%20ALPHA&show_marked=1')
        ->assertOk()
        ->assertJsonCount(1, 'suggestions')
        ->assertJsonPath('suggestions.0.id', $voter->id);
});

it('paginates culaan voters by 20 records per page', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    foreach (range(1, 25) as $index) {
        PemilihRecord::query()->create([
            'identity_number' => '90010102'.str_pad((string) $index, 4, '0', STR_PAD_LEFT),
            'no_kp' => '90010102'.str_pad((string) $index, 4, '0', STR_PAD_LEFT),
            'name' => 'PEMILIH '.str_pad((string) $index, 2, '0', STR_PAD_LEFT),
            'dm' => 'UDM PAGINASI',
            'locality' => 'LOKALITI PAGINASI',
            'status' => 'aktif',
            'cula_code' => '?',
            'cula_display_label' => 'BELUM DICULA',
        ]);
    }

    $this->actingAs($user)
        ->get(route('culaan.index', ['udm' => 'UDM PAGINASI']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 25)
            ->where('voters.per_page', 20)
            ->where('voters.current_page', 1)
            ->where('voters.data', fn ($data) => count($data) === 20));

    $this->actingAs($user)
        ->get(route('culaan.index', ['udm' => 'UDM PAGINASI', 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('voters.current_page', 2)
            ->where('voters.data', fn ($data) => count($data) === 5));
});

it('normalizes and deduplicates voter hashtags', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025569',
        'no_kp' => '900101025569',
        'name' => 'ALI HASHTAG',
        'dm' => 'UDM HASHTAG',
        'locality' => 'LOKALITI HASHTAG',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)
        ->putJson(route('pemilih.hashtags.update', $voter), [
            'hashtags' => ['#Keluarga', '#keluarga', '#Sahabat'],
        ])
        ->assertOk()
        ->assertJsonPath('hashtags', ['#keluarga', '#sahabat']);

    expect($voter->fresh()->hashtags->pluck('name')->all())->toBe(['#keluarga', '#sahabat']);
    $this->assertDatabaseCount('hashtags', 2);
    $this->assertDatabaseCount('hashtag_pemilih_record', 2);
});

it('returns matching unique hashtag suggestions', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    foreach (range(1, 2) as $index) {
        $voter = PemilihRecord::query()->create([
            'identity_number' => '90010102557'.$index,
            'no_kp' => '90010102557'.$index,
            'name' => 'PEMILIH CADANGAN '.$index,
            'dm' => 'UDM HASHTAG',
            'locality' => 'LOKALITI HASHTAG',
            'status' => 'aktif',
            'cula_code' => '?',
            'cula_display_label' => 'BELUM DICULA',
        ]);

        $this->actingAs($user)->putJson(route('pemilih.hashtags.update', $voter), [
            'hashtags' => ['#Keluarga', '#Kawasan'],
        ])->assertOk();
    }

    $this->actingAs($user)
        ->getJson(route('pemilih.hashtags.suggestions', ['q' => '#kel']))
        ->assertOk()
        ->assertJsonPath('hashtags', ['#keluarga']);
});

it('filters culaan voters by hashtag', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $match = PemilihRecord::query()->create([
        'identity_number' => '900101025573',
        'no_kp' => '900101025573',
        'name' => 'PEMILIH DENGAN HASHTAG',
        'dm' => 'UDM HASHTAG',
        'locality' => 'LOKALITI HASHTAG',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);
    $other = PemilihRecord::query()->create([
        'identity_number' => '900101025574',
        'no_kp' => '900101025574',
        'name' => 'PEMILIH TANPA HASHTAG',
        'dm' => 'UDM HASHTAG',
        'locality' => 'LOKALITI HASHTAG',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);
    $outsideUdm = PemilihRecord::query()->create([
        'identity_number' => '900101025575',
        'no_kp' => '900101025575',
        'name' => 'PEMILIH UDM LAIN',
        'dm' => 'UDM LAIN',
        'locality' => 'LOKALITI LAIN',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $this->actingAs($user)->putJson(route('pemilih.hashtags.update', $match), [
        'hashtags' => ['#sasaran'],
    ])->assertOk();
    $this->actingAs($user)->putJson(route('pemilih.hashtags.update', $outsideUdm), [
        'hashtags' => ['#luar-udm'],
    ])->assertOk();

    $this->actingAs($user)
        ->get(route('culaan.index', [
            'udm' => 'UDM HASHTAG',
            'hashtags' => ['#sasaran'],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.hashtags', ['#sasaran'])
            ->where('available_hashtags', ['#sasaran'])
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $match->id)
            ->where('voters.data', fn ($data) => collect($data)->pluck('id')->doesntContain($other->id)));
});

it('shows tagged voters even when their culaan is already completed', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $voter = PemilihRecord::query()->create([
        'identity_number' => '900101025576',
        'no_kp' => '900101025576',
        'name' => 'PEMILIH CULA SIAP',
        'dm' => 'UDM TAGGED',
        'locality' => 'LOKALITI TAGGED',
        'status' => 'aktif',
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
    ]);

    CulaWorkItem::query()->create([
        'pemilih_record_id' => $voter->id,
        'marked_by' => $user->id,
        'marked_at' => now(),
    ]);

    $this->actingAs($user)->putJson(route('pemilih.hashtags.update', $voter), [
        'hashtags' => ['#siap'],
    ])->assertOk();

    $this->actingAs($user)
        ->get(route('culaan.index', [
            'udm' => 'UDM TAGGED',
            'hashtags' => ['#siap'],
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $voter->id));
});

it('only exposes hashtags from the current culaan data', function () {
    $user = User::factory()->withModules(['dashboard', 'culaan'])->create();

    $availableVoter = PemilihRecord::query()->create([
        'identity_number' => '900101025577',
        'no_kp' => '900101025577',
        'name' => 'PEMILIH TANPA TAG',
        'dm' => 'UDM SEMAK TAG',
        'locality' => 'LOKALITI SEMAK TAG',
        'status' => 'aktif',
        'cula_code' => '?',
        'cula_display_label' => 'BELUM DICULA',
    ]);

    $completedVoter = PemilihRecord::query()->create([
        'identity_number' => '900101025578',
        'no_kp' => '900101025578',
        'name' => 'PEMILIH TAG SIAP',
        'dm' => 'UDM SEMAK TAG',
        'locality' => 'LOKALITI SEMAK TAG',
        'status' => 'aktif',
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
    ]);

    CulaWorkItem::query()->create([
        'pemilih_record_id' => $completedVoter->id,
        'marked_by' => $user->id,
        'marked_at' => now(),
    ]);

    $this->actingAs($user)->putJson(route('pemilih.hashtags.update', $completedVoter), [
        'hashtags' => ['#tag-siap'],
    ])->assertOk();

    $this->actingAs($user)
        ->get(route('culaan.index', ['udm' => 'UDM SEMAK TAG']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $availableVoter->id)
            ->where('available_hashtags', []));
});
