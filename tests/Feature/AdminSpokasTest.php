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
            ->where('results.source_count', 3)
            ->where('results.updated_count', 2)
            ->where('results.ic_matches.0.match_by', 'ic')
            ->where('results.name_matches.0.match_by', 'nama')
            ->where('results.failed.0.reason', 'Tiada padanan berdasarkan IC atau nama.')
        );

    expect($icRecord->fresh()->no_ahli)->toBe('A-001')
        ->and($nameRecord->fresh()->no_ahli)->toBe('A-002')
        ->and(SpokasMigrationRun::query()->count())->toBe(1);

    $this->actingAs($admin)
        ->get(route('admin.spokas.index'))
        ->assertInertia(fn ($page) => $page
            ->where('results.updated_count', 2)
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
            ->where('results', null)
            ->where('last_migrated_at', null)
        );
});
