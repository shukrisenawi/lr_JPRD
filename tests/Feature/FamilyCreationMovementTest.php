<?php

use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Models\User;
use App\Services\FamilyCreationMovementService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function movementVoter(string $udm = 'UDM A', string $locality = 'LOKALITI A'): PemilihRecord
{
    return PemilihRecord::query()->create([
        'identity_number' => (string) Str::uuid(), 'name' => 'AHMAD BIN ALI',
        'dm' => $udm, 'locality' => $locality, 'race' => 'MELAYU', 'status' => 'aktif', 'is_manual' => false,
    ]);
}

it('counts family creation once per UDM and not member additions or removals', function () {
    $user = User::factory()->withModules(['keluarga-pemilih', 'laporan'])->create();
    $voters = collect([movementVoter(), movementVoter(), movementVoter('UDM B')]);
    $this->actingAs($user)->post(route('keluarga-pemilih.store'), [
        'pemilih_ids' => $voters->pluck('id')->all(),
    ])->assertSessionHasNoErrors();
    $family = PemilihFamily::query()->sole();
    $this->get(route('laporan.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('family_creation_movement.total', 1)
        ->where('family_creation_movement.rows.0.total', 1)
        ->where('family_creation_movement.rows.1.total', 1)
        ->where('family_creation_movement.can_reset', false));

    $extra = movementVoter();
    $this->post(route('keluarga-pemilih.members.store', $family), ['pemilih_ids' => [$extra->id]])->assertSessionHasNoErrors();
    expect(app(FamilyCreationMovementService::class)->summary($user)['total'])->toBe(1);
    foreach ($voters->push($extra) as $voter) {
        $this->deleteJson(route('keluarga-pemilih.members.destroy', [$family, $voter]))->assertOk();
    }
    expect(PemilihFamily::query()->count())->toBe(0);
    expect(app(FamilyCreationMovementService::class)->summary($user)['total'])->toBe(1);
});

it('resets only counters after admin confirmation and counts new families in the same second', function () {
    $this->freezeTime();
    $admin = User::factory()->masterAdmin()->create();
    $this->actingAs($admin)->post(route('keluarga-pemilih.store'), ['pemilih_ids' => [movementVoter()->id]])->assertSessionHasNoErrors();
    $this->post(route('laporan.keluarga.reset'))->assertSessionHasErrors('confirmed');
    expect(app(FamilyCreationMovementService::class)->summary($admin)['total'])->toBe(1);
    $this->post(route('laporan.keluarga.reset'), ['confirmed' => false])->assertSessionHasErrors('confirmed');
    $this->from(route('laporan.index'))->post(route('laporan.keluarga.reset'), ['confirmed' => true])
        ->assertRedirect(route('laporan.index'))->assertSessionHasNoErrors();
    expect(app(FamilyCreationMovementService::class)->summary($admin))
        ->toMatchArray(['total' => 0, 'can_reset' => true]);
    $this->assertDatabaseCount('pemilih_families', 1);
    $this->assertDatabaseCount('pemilih_family_members', 1);
    $this->assertDatabaseCount('family_creation_movements', 1);
    $this->post(route('keluarga-pemilih.store'), ['pemilih_ids' => [movementVoter()->id]])->assertSessionHasNoErrors();
    expect(app(FamilyCreationMovementService::class)->summary($admin)['total'])->toBe(1);
    expect(app(FamilyCreationMovementService::class)->summary($admin)['reset_at'])->not->toBeNull();
});

it('rejects reset by non admins even with laporan and settings access', function () {
    $user = User::factory()->withModules(['laporan', 'settings'])->create();
    $this->actingAs($user)->postJson(route('laporan.keluarga.reset'), ['confirmed' => true])->assertForbidden();
    expect(Setting::valueOf('family_creation_movement_reset'))->toBeNull();
});

it('requires authentication and laporan module access', function () {
    $this->post(route('laporan.keluarga.reset'), ['confirmed' => true])->assertRedirect(route('login'));
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    $this->actingAs($user)->postJson(route('laporan.keluarga.reset'), ['confirmed' => true])->assertForbidden();
});

it('restricts summaries to UDM and locality scope without double counting localities', function () {
    $admin = User::factory()->masterAdmin()->create();
    $voters = collect([movementVoter(), movementVoter('UDM A', 'LOKALITI B'), movementVoter('UDM B')]);
    $this->actingAs($admin)->post(route('keluarga-pemilih.store'), ['pemilih_ids' => $voters->pluck('id')->all()])->assertSessionHasNoErrors();
    $user = User::factory()->withModules(['laporan'])->create(['access_level' => 'cawangan', 'scope_key' => 'UDM A|LOKALITI A']);
    $this->actingAs($user)->get(route('laporan.index'))->assertInertia(fn ($page) => $page
        ->has('family_creation_movement.rows', 1)
        ->where('family_creation_movement.rows.0.udm', 'UDM A')
        ->where('family_creation_movement.rows.0.total', 1)
        ->where('family_creation_movement.total', 1));
    $user->update(['access_level' => 'udm', 'scope_key' => 'UDM A']);
    expect(app(FamilyCreationMovementService::class)->summary($user)['rows'])->toBe([['udm' => 'UDM A', 'total' => 1]]);
});

it('backfills existing families once per location and keeps zero count UDMs after reset', function () {
    $admin = User::factory()->masterAdmin()->create();
    $voters = collect([movementVoter(), movementVoter(), movementVoter('UDM B')]);
    $family = PemilihFamily::query()->create(['name' => 'Keluarga lama', 'created_by' => $admin->id]);
    $family->members()->attach($voters->pluck('id')->all());
    $migration = require database_path('migrations/2026_10_29_000001_create_family_creation_movements_table.php');
    $migration->down();
    $migration->up();
    expect(DB::table('family_creation_movements')->count())->toBe(2);
    $service = app(FamilyCreationMovementService::class);
    expect($service->summary($admin)['total'])->toBe(1);
    $service->reset($admin);
    expect($service->summary($admin)['rows'])->toBe([
        ['udm' => 'UDM A', 'total' => 0], ['udm' => 'UDM B', 'total' => 0],
    ]);
});

it('does not count failed family creation', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create(['access_level' => 'udm', 'scope_key' => 'UDM A']);
    $this->actingAs($user)->post(route('keluarga-pemilih.store'), ['pemilih_ids' => [movementVoter('UDM B')->id]])->assertSessionHasErrors();
    $this->assertDatabaseCount('family_creation_movements', 0);
});
