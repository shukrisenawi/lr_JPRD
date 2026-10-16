<?php

use App\Models\User;

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
