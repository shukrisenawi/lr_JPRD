<?php

use App\Models\User;

it('allows UDM users with the module to open their dashboard', function () {
    $user = User::factory()->withModules(['dashboard-udm'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM UJIAN',
    ]);

    $this->actingAs($user)->get(route('dashboard-udm'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('DashboardUdm')->where('udm', 'UDM UJIAN'));
});

it('denies UDM users without the module', function () {
    $user = User::factory()->withModules([])->create(['access_level' => 'udm']);

    $this->actingAs($user)->getJson(route('dashboard-udm'))->assertForbidden();
});

it('denies other access levels even with the module', function ($level) {
    $user = User::factory()->withModules(['dashboard-udm'])->create(['access_level' => $level]);

    $this->actingAs($user)->getJson(route('dashboard-udm'))->assertForbidden();
})->with(['jprd', 'cawangan']);

it('denies master admins even at UDM level', function () {
    $user = User::factory()->masterAdmin()->create(['access_level' => 'udm']);

    $this->actingAs($user)->getJson(route('dashboard-udm'))->assertForbidden();
});
