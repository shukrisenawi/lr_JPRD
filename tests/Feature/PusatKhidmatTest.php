<?php

use App\Models\PemilihRecord;
use App\Models\PusatKhidmatData;
use App\Models\Setting;
use App\Models\User;
use App\Services\PusatKhidmatService;
use Illuminate\Support\Str;

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

it('builds the unreviewed Pusat Khidmat status from belum and telah cula records', function () {
    $admin = User::factory()->masterAdmin()->create();
    $sheetKey = md5(PusatKhidmatService::DEFAULT_SHEET_URL);

    Setting::setValue('pusat_khidmat_last_sync_at', now()->toDateTimeString());

    $belumCula = PemilihRecord::create([
        'identity_number' => (string) Str::uuid(),
        'no_kp' => '900101025551',
        'name' => 'BELUM CULA',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => null,
    ]);
    $telahCula = PemilihRecord::create([
        'identity_number' => (string) Str::uuid(),
        'no_kp' => '900101025552',
        'name' => 'TELAH CULA',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
    ]);
    $sudahSemak = PemilihRecord::create([
        'identity_number' => (string) Str::uuid(),
        'no_kp' => '900101025553',
        'name' => 'SUDAH SEMAK',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => '2',
        'cula_display_label' => '2 - PAS',
    ]);

    $addData = function (string $rowKey, ?PemilihRecord $pemilih, int $position, ?string $checkedAt = null) use ($sheetKey): void {
        PusatKhidmatData::create([
            'sheet_key' => $sheetKey,
            'row_key' => $rowKey,
            'row_fingerprint' => 'fingerprint-'.$rowKey,
            'position' => $position,
            'no_kp' => $pemilih?->no_kp,
            'pemilih_record_id' => $pemilih?->id,
            'payload' => ['NAMA PEMOHON' => $pemilih?->name ?? 'TIADA PAUTAN'],
            'status' => 'aktif',
            'checked_at' => $checkedAt,
        ]);
    };

    $addData('row-belum', $belumCula, 1);
    $addData('row-telah', $telahCula, 2);
    $addData('row-semak', $sudahSemak, 3, now()->toDateTimeString());
    $addData('row-tiada', null, 4);

    expect(app(PusatKhidmatService::class)->getUnreviewedCounts($admin))
        ->toBe(['belum_cula' => 1, 'telah_cula' => 1, 'total' => 2]);

    $this->actingAs($admin)
        ->get(route('pusat-khidmat.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('pusat_khidmat_message', fn ($message) => str_contains($message, "♦️BELUM CULA\n1️⃣")
                && str_contains($message, "♦️TELAH CULA\n1️⃣")
                && str_contains($message, "🟩JUMLAH BELUM SEMAK\n2️⃣")));
});
