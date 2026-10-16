<?php

use App\Models\User;

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
