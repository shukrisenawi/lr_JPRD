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

it('opens reviewed families with target members regardless of race or UDM', function () {
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
        ->has('families.data.0.members', 2)
        ->where('families.data.0.members.1.udm', 'UDM B')
        ->where('families.data.0.members.0.cula_code', '1')
        ->has('families.data.0.members.0.no_kp')
        ->has('families.data.0.members.0.old_ic'));
});

it('hides families without target voters and excludes all 3 codes from UDM counts', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    $excluded = PemilihFamily::query()->create(['name' => 'Tiada sasaran', 'reviewed_at' => now()]);
    foreach (['2', '3', '3B', '3D', '3K', '3M', '3P', '3U', '4P'] as $code) {
        $excluded->members()->attach(reviewedFamilyMember(['cula_code' => $code])->id);
    }
    $target = PemilihFamily::query()->create(['name' => 'Ada sasaran', 'reviewed_at' => now()]);
    foreach (['1', '4', null, ''] as $code) {
        $target->members()->attach(reviewedFamilyMember(['cula_code' => $code])->id);
    }

    $this->actingAs($user)->get(route('keluarga-disemak.index', ['udm' => 'UDM A']))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->where('families.total', 1)
        ->where('families.data.0.name', 'Ada sasaran')
        ->has('families.data.0.members', 4)
        ->where('udmSummaries.0.families', 1));
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

it('filters by locality within the selected UDM while keeping all accessible family members', function () {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create();
    $family = PemilihFamily::query()->create(['name' => 'Keluarga Lokaliti', 'reviewed_at' => now()]);
    $family->members()->attach(reviewedFamilyMember(['locality' => 'Lokaliti A'])->id);
    $family->members()->attach(reviewedFamilyMember(['locality' => 'Lokaliti B'])->id);
    $other = PemilihFamily::query()->create(['name' => 'Keluarga Lain', 'reviewed_at' => now()]);
    $other->members()->attach(reviewedFamilyMember(['locality' => 'Lokaliti B'])->id);
    reviewedFamilyMember(['dm' => 'UDM B', 'locality' => 'Lokaliti Luar']);

    $this->actingAs($user)->get(route('keluarga-disemak.index', ['udm' => 'UDM A', 'locality' => 'Lokaliti A']))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->where('filters.locality', 'Lokaliti A')
        ->where('localities', ['Lokaliti A', 'Lokaliti B'])
        ->where('families.total', 1)
        ->has('families.data.0.members', 2));
    $this->getJson(route('keluarga-disemak.index', ['udm' => 'UDM A', 'locality' => 'Lokaliti Luar']))
        ->assertUnprocessable()->assertJsonValidationErrors('locality');
    $this->getJson(route('keluarga-disemak.index', ['locality' => 'Lokaliti A']))
        ->assertUnprocessable()->assertJsonValidationErrors('locality');
    $this->get(route('keluarga-disemak.index', ['udm' => 'UDM B']))
        ->assertInertia(fn ($page) => $page->where('filters.locality', '')->where('localities', ['Lokaliti Luar']));
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
