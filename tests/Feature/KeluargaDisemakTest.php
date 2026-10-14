<?php

use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Support\Str;

function reviewedFamilyMember(array $attributes = []): PemilihRecord
{
    return PemilihRecord::query()->create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'name' => 'Ahli Ujian',
        'dm' => 'UDM A',
        'status' => 'aktif',
    ], $attributes));
}

it('shows UDM cards and counts only reviewed families without loading member details', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    foreach ([now(), null] as $reviewedAt) {
        $family = PemilihFamily::query()->create(['name' => 'Keluarga Ujian', 'reviewed_at' => $reviewedAt]);
        $family->members()->attach(reviewedFamilyMember()->id);
    }
    reviewedFamilyMember(['dm' => 'UDM B']);

    $this->actingAs($user)->get(route('keluarga-disemak.index'))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->component('KeluargaDisemak/Index')
        ->where('families', null)
        ->where('filters.udm', '')
        ->where('udmSummaries.0.udm', 'UDM A')
        ->where('udmSummaries.0.families', 1)
        ->where('udmSummaries.1.families', 0));
});

it('opens reviewed families with all members regardless of code, race or UDM', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    $family = PemilihFamily::query()->create(['name' => 'Keluarga Lengkap', 'reviewed_at' => now()]);
    foreach (['2', '3', '3B', '3P', '4P', '1', null] as $index => $code) {
        $family->members()->attach(reviewedFamilyMember([
            'name' => 'Ahli '.$index,
            'cula_code' => $code,
            'dm' => $index === 6 ? 'UDM B' : 'UDM A',
            'race' => $index === 6 ? 'CINA' : 'MELAYU',
        ])->id);
    }
    $pending = PemilihFamily::query()->create(['name' => 'Belum disemak']);
    $pending->members()->attach(reviewedFamilyMember()->id);

    $this->actingAs($user)->get(route('keluarga-disemak.index', ['udm' => 'UDM A']))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->where('families.total', 1)
        ->where('families.data.0.name', 'Keluarga Lengkap')
        ->has('families.data.0.members', 7)
        ->where('families.data.0.members.6.udm', 'UDM B')
        ->missing('families.data.0.members.0.cula_code'));
});

it('respects UDM scope for cards and members and rejects an outside UDM', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create([
        'access_level' => 'udm', 'scope_key' => 'UDM A',
    ]);
    $family = PemilihFamily::query()->create(['name' => 'Keluarga Campuran', 'reviewed_at' => now()]);
    foreach (['UDM A', 'UDM B'] as $udm) {
        $family->members()->attach(reviewedFamilyMember(['dm' => $udm])->id);
    }
    $this->actingAs($user)->get(route('keluarga-disemak.index', ['udm' => 'UDM A']))
        ->assertInertia(fn ($page) => $page
            ->has('udmSummaries', 1)
            ->has('families.data.0.members', 1)
            ->where('families.data.0.members.0.udm', 'UDM A'));
    $this->getJson(route('keluarga-disemak.index', ['udm' => 'UDM B']))
        ->assertUnprocessable()->assertJsonValidationErrors('udm');
});

it('requires authentication', function () {
    $this->get(route('keluarga-disemak.index'))->assertRedirect(route('login'));
});

it('requires family module access', function () {
    $user = User::factory()->withModules(['carian-pemilih'])->create();
    $this->actingAs($user)->getJson(route('keluarga-disemak.index'))->assertForbidden();
});

it('paginates families while keeping the UDM filter', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    for ($i = 0; $i < 13; $i++) {
        $family = PemilihFamily::query()->create(['name' => 'Keluarga '.$i, 'reviewed_at' => now()]);
        $family->members()->attach(reviewedFamilyMember()->id);
    }
    $this->actingAs($user)->get(route('keluarga-disemak.index', ['udm' => 'UDM A', 'page' => 2]))
        ->assertInertia(fn ($page) => $page
            ->where('filters.udm', 'UDM A')
            ->where('families.total', 13)
            ->where('families.current_page', 2)
            ->has('families.data', 1));
});
