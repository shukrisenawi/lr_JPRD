<?php

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
