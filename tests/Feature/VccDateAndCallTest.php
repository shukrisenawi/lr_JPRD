<?php

use App\Models\PemilihRecord;
use App\Models\User;

it('filters VCC voters by birth date and stores the call response', function () {
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
            'tarikh_lahir' => '1990-09-24',
            'has_phone' => false,
            'per_udm_count' => '',
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.tarikh_lahir', '1990-09-24')
            ->where('summary.total', 1)
            ->where('voters.data.0.id', $match->id)
            ->where('voters.data.0.call_status', 'not_called'));

    $this->actingAs($user)
        ->postJson(route('vcc.communication.call'), [
            'voter_id' => $match->id,
            'status' => 'called',
            'notes' => 'Akan hadir ke program.',
        ])
        ->assertOk()
        ->assertJsonPath('call_status', 'called')
        ->assertJsonPath('call_remark', 'Akan hadir ke program.');

    $this->assertDatabaseHas('voter_communications', [
        'voter_id' => $match->id,
        'type' => 'call',
        'status' => 'called',
        'notes' => 'Akan hadir ke program.',
    ]);

    $this->actingAs($user)
        ->get(route('vcc.index', [
            'bulan_lahir' => '',
            'tarikh_lahir' => '1990-09-24',
            'has_phone' => false,
            'per_udm_count' => '',
        ]))
        ->assertInertia(fn ($page) => $page
            ->where('voters.data.0.call_status', 'called')
            ->where('voters.data.0.call_remark', 'Akan hadir ke program.'));
});
