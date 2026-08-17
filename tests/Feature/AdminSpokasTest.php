<?php

use App\Models\PemilihRecord;
use App\Models\SpokasMember;
use App\Models\SpokasMigrationResult;
use App\Models\SpokasMigrationRun;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows a master admin to run spokas migration and returns grouped results', function () {
    $admin = User::factory()->masterAdmin()->create();

    $icRecord = PemilihRecord::query()->create([
        'identity_number' => 'pemilih-ic-1',
        'no_kp' => '900101-01-1234',
        'name' => 'NAMA IC',
        'status' => 'aktif',
    ]);
    $oldIcRecord = PemilihRecord::query()->create([
        'identity_number' => 'pemilih-old-ic-1',
        'no_kp' => '810202-02-1234',
        'old_ic' => 'A1234567',
        'name' => 'NAMA IC LAMA',
        'status' => 'aktif',
    ]);
    $nameRecord = PemilihRecord::query()->create([
        'identity_number' => 'pemilih-name-1',
        'no_kp' => '910202021234',
        'name' => 'NAMA FALLBACK',
        'status' => 'aktif',
    ]);

    SpokasMember::query()->create([
        'name' => 'SPoKAS IC',
        'member_number' => 'A-001',
        'ic_birth' => '900101011234',
    ]);
    SpokasMember::query()->create([
        'name' => 'SPoKAS IC LAMA',
        'member_number' => 'A-002',
        'ic_birth' => null,
        'ic_old' => 'A1234567',
    ]);
    SpokasMember::query()->create([
        'name' => 'NAMA FALLBACK',
        'member_number' => 'A-003',
        'ic_birth' => null,
    ]);
    SpokasMember::query()->create([
        'name' => 'TIADA PADANAN',
        'member_number' => 'A-004',
        'ic_birth' => '990909099999',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.spokas.migrate'))
        ->assertRedirect(route('admin.spokas.index'));

    $this->get(route('admin.spokas.index'))
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Spokas')
            ->where('run.source_count', 4)
            ->where('run.updated_count', 2)
            ->where('run.ic_match_count', 2)
            ->where('run.name_match_count', 1)
            ->where('run.failed_count', 1)
            ->where('results.total', 2)
        );

    expect($icRecord->fresh()->no_ahli)->toBe('A-001')
        ->and($oldIcRecord->fresh()->no_ahli)->toBe('A-002')
        ->and($nameRecord->fresh()->no_ahli)->toBeNull()
        ->and(SpokasMigrationRun::query()->count())->toBe(1);

    $this->actingAs($admin)
        ->get(route('admin.spokas.index'))
        ->assertInertia(fn ($page) => $page
            ->where('result_counts.ic', 2)
            ->where('result_counts.name', 1)
            ->where('result_counts.not_found', 1)
            ->where('last_migrated_at', fn ($value) => is_string($value) && $value !== '')
        );
});

it('allows a master admin to approve or reject a name match after comparing identity numbers', function () {
    $admin = User::factory()->masterAdmin()->create();
    $approvedRecord = PemilihRecord::query()->create([
        'identity_number' => 'pemilih-name-approve',
        'no_kp' => '900101011234',
        'old_ic' => 'A100',
        'name' => 'NAMA SAMA APPROVE',
        'status' => 'aktif',
    ]);
    PemilihRecord::query()->create([
        'identity_number' => 'pemilih-name-reject',
        'no_kp' => '910202021234',
        'old_ic' => 'A200',
        'name' => 'NAMA SAMA REJECT',
        'status' => 'aktif',
    ]);
    SpokasMember::query()->create([
        'name' => 'NAMA SAMA APPROVE',
        'member_number' => 'LULUS-001',
        'ic_birth' => '800101011234',
        'ic_old' => 'B100',
    ]);
    SpokasMember::query()->create([
        'name' => 'NAMA SAMA REJECT',
        'member_number' => 'TOLAK-001',
        'ic_birth' => '810202021234',
        'ic_old' => 'B200',
    ]);

    $this->actingAs($admin)->post(route('admin.spokas.migrate'))->assertRedirect(route('admin.spokas.index'));

    $approvedResult = SpokasMigrationResult::query()->where('name', 'NAMA SAMA APPROVE')->firstOrFail();
    $rejectedResult = SpokasMigrationResult::query()->where('name', 'NAMA SAMA REJECT')->firstOrFail();

    $this->postJson(route('admin.spokas.results.approve', $approvedResult))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('remark');

    $this->postJson(route('admin.spokas.results.approve', $approvedResult), [
        'remark' => 'No. K/P tidak sama tetapi nama dan IC lama disahkan.',
    ])
        ->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Nama NAMA SAMA APPROVE berjaya dikemaskini. No. Ahli PAS LULUS-001 telah disimpan.',
        ]);
    $this->postJson(route('admin.spokas.results.reject', $rejectedResult), [
        'remark' => 'No. K/P lama tidak sepadan dengan rekod pemilih.',
    ])
        ->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Nama NAMA SAMA REJECT telah ditolak.',
        ]);

    expect($approvedRecord->fresh()->no_ahli)->toBe('LULUS-001')
        ->and($approvedResult->fresh()->category)->toBe('approved')
        ->and($approvedResult->fresh()->remark)->toBe('No. K/P tidak sama tetapi nama dan IC lama disahkan.')
        ->and($rejectedResult->fresh()->category)->toBe('rejected')
        ->and($rejectedResult->fresh()->remark)->toBe('No. K/P lama tidak sepadan dengan rekod pemilih.');

    $this->actingAs($admin)
        ->get(route('admin.spokas.index', ['tab' => 'approved']))
        ->assertInertia(fn ($page) => $page
            ->where('active_tab', 'approved')
            ->where('result_counts.approved', 1)
            ->where('results.data.0.member_number', 'LULUS-001')
            ->where('results.data.0.pemilih_name', 'NAMA SAMA APPROVE')
            ->where('results.data.0.remark', 'No. K/P tidak sama tetapi nama dan IC lama disahkan.'));

    $this->actingAs($admin)
        ->get(route('admin.spokas.index', ['tab' => 'rejected']))
        ->assertInertia(fn ($page) => $page
            ->where('results.data.0.remark', 'No. K/P lama tidak sepadan dengan rekod pemilih.'));
});

it('allows a master admin to open the spokas page', function () {
    $admin = User::factory()->masterAdmin()->create();

    $this->actingAs($admin)
        ->get(route('admin.spokas.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Spokas')
            ->where('run', null)
            ->where('results', null)
            ->where('last_migrated_at', null)
        );
});

it('allows a role with spokas access to open the spokas page', function () {
    $user = User::factory()->withModules(['dashboard', 'spokas'])->create();

    $this->actingAs($user)
        ->get(route('admin.spokas.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/Spokas'));
});

it('blocks a role without spokas access from opening the spokas page', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('admin.spokas.index'))
        ->assertStatus(302)
        ->assertSessionHas('error', 'Anda tidak mempunyai akses ke halaman ini.');

    $this->assertAuthenticatedAs($user);
});

it('allows a master admin to rollback the latest spokas migration', function () {
    $admin = User::factory()->masterAdmin()->create();
    $record = PemilihRecord::query()->create([
        'identity_number' => 'pemilih-rollback-1',
        'no_kp' => '900101-01-1234',
        'name' => 'NAMA ROLLBACK',
        'status' => 'aktif',
    ]);
    SpokasMember::query()->create([
        'name' => 'NAMA ROLLBACK',
        'member_number' => 'BARU-001',
        'ic_birth' => '900101011234',
    ]);

    $this->actingAs($admin)->post(route('admin.spokas.migrate'))->assertRedirect(route('admin.spokas.index'));
    $this->post(route('admin.spokas.migrate'))->assertRedirect(route('admin.spokas.index'));

    expect($record->fresh()->no_ahli)->toBe('BARU-001');

    $this->post(route('admin.spokas.rollback'))
        ->assertRedirect(route('admin.spokas.index'))
        ->assertSessionHas('success', '1 nombor ahli PAS daripada data SPoKAS berjaya dikosongkan.');

    expect($record->fresh()->no_ahli)->toBeNull()
        ->and(SpokasMigrationRun::query()->count())->toBe(0);
});

it('clears spokas member numbers even after migration logs are gone', function () {
    $admin = User::factory()->masterAdmin()->create();
    $record = PemilihRecord::query()->create([
        'identity_number' => 'pemilih-clear-1',
        'no_kp' => '900101-01-1234',
        'name' => 'NAMA KOSONG',
        'no_ahli' => 'PAS-001',
        'status' => 'aktif',
    ]);
    SpokasMember::query()->create([
        'name' => 'NAMA KOSONG',
        'member_number' => 'PAS-001',
        'ic_birth' => '900101011234',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.spokas.rollback'))
        ->assertRedirect(route('admin.spokas.index'));

    expect($record->fresh()->no_ahli)->toBeNull();
});
