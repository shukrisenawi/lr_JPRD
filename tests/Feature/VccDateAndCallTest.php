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
            ->where('summary.total', 2)
            ->where('voters.data', fn ($data) => collect($data)->pluck('id')->sort()->values()->all() === collect([$match->id, $sameBirthday->id])->sort()->values()->all()));

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
            'tarikh_lahir' => '24-09',
            'has_phone' => false,
            'per_udm_count' => '',
        ]))
        ->assertInertia(fn ($page) => $page
            ->where('voters.data', function ($data) use ($match) {
                $voter = collect($data)->firstWhere('id', $match->id);

                return $voter['call_status'] === 'called'
                    && $voter['call_remark'] === 'Akan hadir ke program.';
            }));
});
