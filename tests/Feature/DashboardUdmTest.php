<?php

use App\Models\Dana;
use App\Models\DanaKategori;
use App\Models\PemilihRecord;
use App\Models\User;
use App\Services\DanaSummaryService;

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

it('aggregates locality statistics and payments only for the assigned UDM', function () {
    $user = User::factory()->withModules(['dashboard-udm'])->create(['access_level' => 'udm', 'scope_key' => 'UDM A']);
    foreach ([
        ['dm' => 'UDM A', 'locality' => 'Lokaliti A', 'cula_code' => '2', 'no_ahli' => '123'],
        ['dm' => 'UDM A', 'locality' => 'Lokaliti A', 'cula_code' => null, 'no_ahli' => '-'],
        ['dm' => 'UDM A', 'locality' => 'Lokaliti B', 'cula_code' => '3U'],
        ['dm' => 'UDM A', 'locality' => 'Lokaliti B', 'cula_code' => '0'],
        ['dm' => 'UDM B', 'locality' => 'Rahsia', 'cula_code' => '2'],
        ['dm' => 'UDM A', 'locality' => 'Tidak Aktif', 'status' => 'xaktif'],
        ['dm' => 'UDM A', 'locality' => 'Manual', 'is_manual' => true],
    ] as $i => $attributes) {
        PemilihRecord::create(['identity_number' => 'dashboard-'.$i, ...$attributes]);
    }
    $category = DanaKategori::create(['name' => DanaSummaryService::PAYMENT_CATEGORY]);
    foreach ([['UDM A', 'masuk', 120], ['UDM A', 'keluar', 50], ['UDM B', 'masuk', 900]] as [$udm, $jenis, $amount]) {
        Dana::create(['udm' => $udm, 'kategori_id' => $category->id, 'jenis' => $jenis, 'jumlah' => $amount, 'tarikh' => '2026-10-14', 'keterangan' => 'Bayaran ujian', 'created_by' => $user->id]);
    }

    $this->actingAs($user)->get(route('dashboard-udm'))->assertOk()
        ->assertInertia(fn ($page) => $page->component('DashboardUdm')
            ->where('statistics.totals.total', 4)
            ->where('statistics.totals.with_cula', 2)
            ->where('statistics.totals.without_cula', 2)
            ->where('statistics.totals.members', 1)
            ->where('statistics.totals.percentage', 50)
            ->has('statistics.rows', 2)
            ->where('statistics.rows.0.locality', 'Lokaliti A')
            ->where('statistics.rows.0.breakdown.2', 1)
            ->where('payments.total_bayaran', '120.00')
            ->where('payments.count', 1));
});

it('returns no unscoped statistics when UDM is missing', function () {
    $user = User::factory()->withModules(['dashboard-udm'])->create(['access_level' => 'udm', 'scope_key' => null]);
    PemilihRecord::create(['identity_number' => 'other-udm', 'dm' => 'UDM B']);
    $this->actingAs($user)->get(route('dashboard-udm'))->assertOk()
        ->assertInertia(fn ($page) => $page->where('statistics.totals.total', 0)->has('statistics.rows', 0)->where('payments.total_bayaran', '0.00'));
});
