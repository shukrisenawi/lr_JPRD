<?php

use App\Models\PemilihRecord;
use App\Models\User;

it('excludes PAS related cula codes only from the birthday campaign', function () {
    $user = User::factory()->withModules(['keluarga-disemak', 'vcc'])->create();
    $codes = ['2', '3', '3B', '3D', '3K', '3M', '3P', '3U', '4P', '1', '4', '?'];
    foreach ($codes as $index => $code) {
        PemilihRecord::query()->create([
            'identity_number' => '900924'.str_pad((string) $index, 6, '0', STR_PAD_LEFT),
            'no_kp' => '900924'.str_pad((string) $index, 6, '0', STR_PAD_LEFT),
            'name' => 'PEMILIH '.$code,
            'dm' => 'UDM UJIAN',
            'locality' => 'LOKALITI UJIAN',
            'status' => 'aktif',
            'is_manual' => false,
            'cula_code' => $code,
        ]);
    }

    $params = ['per_udm_count' => '', 'has_phone' => false];
    $this->actingAs($user)->get(route('kempen.hari-jadi.index', $params))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 3)
            ->where('available_cula_codes', fn ($options) => collect($options)->every(fn ($option) => ! in_array($option['code'], ['2', '4P'], true) && ! str_starts_with($option['code'], '3'))));

    $this->get(route('vcc.index', $params))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('summary.total', count($codes)));
});

it('allows kempen birthday page without vcc permission', function () {
    $user = User::factory()->withModules(['keluarga-disemak'])->create();

    $this->actingAs($user)->get(route('kempen.hari-jadi.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Vcc/Index')
            ->where('kempen', true)
            ->where('filters.has_phone', false));
    $this->getJson(route('kempen.hari-jadi.search', ['q' => 'test']))->assertOk();
    $this->getJson(route('vcc.index'))->assertForbidden();
});

it('denies kempen birthday access without kempen permission', function () {
    $user = User::factory()->withModules(['vcc'])->create();

    $this->actingAs($user)->getJson(route('kempen.hari-jadi.index'))->assertForbidden();
    $this->getJson(route('kempen.hari-jadi.search'))->assertForbidden();
});

it('denies pemilih sasaran access with only keluarga pemilih permission', function (string $level) {
    $user = User::factory()->withModules(['keluarga-pemilih'])->create([
        'access_level' => $level,
    ]);

    $this->actingAs($user)->getJson(route('keluarga-disemak.index'))->assertForbidden();
})->with(['jprd', 'udm', 'cawangan']);

it('allows pemilih sasaran access with its own permission', function () {
    $user = User::factory()->withModules(['keluarga-disemak'])->create();

    $this->actingAs($user)->get(route('keluarga-disemak.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('KeluargaDisemak/Index')
            ->where('auth.user.allowed_modules', fn ($modules) => collect($modules)->contains('keluarga-disemak')
                && ! collect($modules)->contains('keluarga-pemilih')));
});
