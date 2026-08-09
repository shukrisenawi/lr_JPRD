<?php

use App\Models\PemilihRecord;
use App\Models\PusatKhidmatData;
use App\Models\Setting;
use App\Models\User;
use App\Services\PusatKhidmatService;

it('allows a master admin to add manual Pusat Khidmat data', function () {
    $admin = User::factory()->masterAdmin()->create();

    $response = $this->actingAs($admin)->postJson(route('pusat-khidmat.manual.store'), [
        'name' => 'Nur Aisyah Tester',
        'no_kp' => '900101025555',
        'phone' => '0123456789',
        'address' => 'Alamat Manual 1',
        'university' => 'Universiti Tester',
        'bidang' => 'Sains Komputer',
        'tarikh_permohonan' => '2026-08-09',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('record.payload.NAMA PEMOHON', 'Nur Aisyah Tester')
        ->assertJsonPath('record.payload.NO KAD PENGENALAN', '900101025555')
        ->assertJsonPath('record.linked', true);

    $this->assertDatabaseHas('pemilih_records', [
        'no_kp' => '900101025555',
        'name' => 'Nur Aisyah Tester',
        'is_manual' => true,
        'created_by' => $admin->id,
    ]);

    $this->assertDatabaseHas('pusat_khidmat_data', [
        'no_kp' => '900101025555',
        'is_manual' => true,
        'status' => 'aktif',
    ]);

    Setting::setValue('pusat_khidmat_last_sync_at', now()->toDateTimeString());
    Setting::setValue('pusat_khidmat_sheet_url', 'https://docs.google.com/spreadsheets/d/another-sheet/edit');

    $records = app(PusatKhidmatService::class)->getRecords($admin);

    expect(collect($records['records'])->firstWhere('id', $response->json('record.id')))->not->toBeNull();
});

it('does not allow duplicate manual Pusat Khidmat data for the same No KP', function () {
    $admin = User::factory()->masterAdmin()->create();
    $payload = [
        'name' => 'Pemohon Manual',
        'no_kp' => '900101025555',
    ];

    $this->actingAs($admin)
        ->postJson(route('pusat-khidmat.manual.store'), $payload)
        ->assertCreated();

    $this->actingAs($admin)
        ->postJson(route('pusat-khidmat.manual.store'), $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['no_kp']);

    expect(PemilihRecord::query()->where('no_kp', '900101025555')->count())->toBe(1);
    expect(PusatKhidmatData::query()->where('no_kp', '900101025555')->count())->toBe(1);
});
