<?php

use App\Models\PemilihRecord;
use App\Models\User;
use App\Models\VoterCommunication;

it('filters VCC voters by birth date and manages the call response', function () {
    $user = User::factory()->withModules(['dashboard', 'vcc'])->create();
    $match = PemilihRecord::query()->create([
        'identity_number' => '900924025501',
        'no_kp' => '900924025501',
        'name' => 'PEMILIH TARIKH SAMA',
        'date_of_birth' => '1990-09-24',
        'dm' => 'UDM TARIKH',
        'locality' => 'LOKALITI TARIKH',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => '?',
    ]);
    $sameBirthday = PemilihRecord::query()->create([
        'identity_number' => '850924025501',
        'no_kp' => '850924025501',
        'name' => 'PEMILIH TARIKH SAMA TAHUN LAIN',
        'date_of_birth' => '1985-09-24',
        'dm' => 'UDM TARIKH',
        'locality' => 'LOKALITI TARIKH',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => '?',
    ]);
    PemilihRecord::query()->create([
        'identity_number' => '900925025501',
        'no_kp' => '900925025501',
        'name' => 'PEMILIH TARIKH LAIN',
        'date_of_birth' => '1990-09-25',
        'dm' => 'UDM TARIKH',
        'locality' => 'LOKALITI TARIKH',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => '?',
    ]);

    $this->actingAs($user)
        ->get(route('vcc.index', [
            'bulan_lahir' => '',
            'tarikh_lahir' => '24-09',
            'has_phone' => false,
            'per_udm_count' => '',
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.tarikh_lahir', '24-09')
            ->where('filters.call_status', 'unmarked')
            ->where('summary.total', 2)
            ->where('summary.call_status_counts.unmarked', 2)
            ->where('voters.data', fn ($data) => collect($data)->pluck('id')->sort()->values()->all() === collect([$match->id, $sameBirthday->id])->sort()->values()->all()));

    $this->actingAs($user)
        ->postJson(route('vcc.communication.call'), [
            'voter_id' => $match->id,
            'status' => 'support',
            'notes' => 'Akan hadir ke program.',
        ])
        ->assertOk()
        ->assertJsonPath('call_status', 'support')
        ->assertJsonPath('call_remark', 'Akan hadir ke program.')
        ->assertJsonPath('contact_date', now()->toDateString());

    $this->assertDatabaseHas('voter_communications', [
        'voter_id' => $match->id,
        'type' => 'call',
        'status' => 'support',
        'notes' => 'Akan hadir ke program.',
    ]);

    expect(VoterCommunication::query()
        ->where('voter_id', $match->id)
        ->where('type', 'call')
        ->firstOrFail()
        ->contact_date?->toDateString())->toBe(now()->toDateString());

    $this->actingAs($user)
        ->get(route('vcc.index', [
            'bulan_lahir' => '',
            'tarikh_lahir' => '24-09',
            'call_status' => 'support',
            'has_phone' => false,
            'per_udm_count' => '',
        ]))
        ->assertInertia(fn ($page) => $page
            ->where('filters.call_status', 'support')
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $match->id)
            ->where('voters.data.0.call_status', 'support')
            ->where('voters.data.0.call_remark', 'Akan hadir ke program.')
            ->where('voters.data.0.call_contact_date', now()->toDateString()));

    $this->actingAs($user)
        ->postJson(route('vcc.communication.call'), [
            'voter_id' => $match->id,
            'status' => 'unmarked',
        ])
        ->assertOk()
        ->assertJsonPath('call_status', 'unmarked')
        ->assertJsonPath('call_remark', null)
        ->assertJsonPath('contact_date', null);

    $this->assertDatabaseHas('voter_communications', [
        'voter_id' => $match->id,
        'type' => 'call',
        'status' => 'unmarked',
        'notes' => null,
        'contact_date' => null,
    ]);

    $this->actingAs($user)
        ->get(route('vcc.index', [
            'bulan_lahir' => '',
            'tarikh_lahir' => '24-09',
            'call_status' => 'unmarked',
            'has_phone' => false,
            'per_udm_count' => '',
        ]))
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 2)
            ->where('summary.call_status_counts.unmarked', 2)
            ->where('voters.data.0.call_status', 'unmarked'));
});
