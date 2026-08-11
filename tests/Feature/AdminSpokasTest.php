<?php

use App\Models\PemilihRecord;
use App\Models\SpokasMember;
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
        'name' => 'NAMA FALLBACK',
        'member_number' => 'A-002',
        'ic_birth' => null,
    ]);
    SpokasMember::query()->create([
        'name' => 'TIADA PADANAN',
        'member_number' => 'A-003',
        'ic_birth' => '990909099999',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.spokas.migrate'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Spokas')
            ->where('run.source_count', 3)
            ->where('run.updated_count', 2)
            ->where('run.ic_match_count', 1)
            ->where('run.name_match_count', 1)
            ->where('run.failed_count', 1)
            ->where('results.total', 1)
        );

    expect($icRecord->fresh()->no_ahli)->toBe('A-001')
        ->and($nameRecord->fresh()->no_ahli)->toBe('A-002')
        ->and(SpokasMigrationRun::query()->count())->toBe(1);

    $this->actingAs($admin)
        ->get(route('admin.spokas.index'))
        ->assertInertia(fn ($page) => $page
            ->where('run.updated_count', 2)
            ->where('last_migrated_at', fn ($value) => is_string($value) && $value !== '')
        );
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

it('allows a master admin to rollback the latest spokas migration', function () {
    $admin = User::factory()->masterAdmin()->create();
    $record = PemilihRecord::query()->create([
        'identity_number' => 'pemilih-rollback-1',
        'no_kp' => '900101-01-1234',
        'name' => 'NAMA ROLLBACK',
        'no_ahli' => 'ASAL-001',
        'status' => 'aktif',
    ]);
    SpokasMember::query()->create([
        'name' => 'NAMA ROLLBACK',
        'member_number' => 'BARU-001',
        'ic_birth' => '900101011234',
    ]);

    $this->actingAs($admin)->post(route('admin.spokas.migrate'))->assertOk();
    $this->post(route('admin.spokas.migrate'))->assertOk();

    expect($record->fresh()->no_ahli)->toBe('BARU-001');

    $this->post(route('admin.spokas.rollback'))
        ->assertRedirect(route('admin.spokas.index'))
        ->assertSessionHas('success', '2 rekod pemilih daripada 2 migrasi berjaya dikembalikan ke data asal.');

    expect($record->fresh()->no_ahli)->toBe('ASAL-001')
        ->and(SpokasMigrationRun::query()->count())->toBe(0);
});
