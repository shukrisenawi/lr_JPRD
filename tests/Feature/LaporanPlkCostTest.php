<?php

use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Str;

function createLaporanPlkRecord(array $attributes = []): PemilihRecord
{
    return PemilihRecord::query()->create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'name' => 'PEMILIH LAPORAN PLK',
        'dm' => 'UDM A',
        'locality' => 'LOKALITI A',
        'status' => 'aktif',
        'is_manual' => false,
        'cula_code' => '3U',
    ], $attributes));
}

it('provides PLK costs in laporan using the same rates and rows as the PLK cost tab', function () {
    $user = User::factory()->withModules(['laporan', 'plk', 'plk-kos'])->create();
    Setting::setValue('plk_rates', json_encode(['3U' => 12.5, '3B' => 100]));
    createLaporanPlkRecord();
    createLaporanPlkRecord();
    createLaporanPlkRecord(['dm' => 'UDM B', 'cula_code' => '3B']);
    createLaporanPlkRecord(['cula_code' => '2']);
    createLaporanPlkRecord(['status' => 'xaktif']);

    $this->actingAs($user)->get(route('laporan.index'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Laporan')
            ->where('plk_cost_summary.codes', fn ($codes) => collect($codes)->pluck('code')->all() === ['3U', '3D', '3P', '3K', '3B', '3M'])
            ->where('plk_cost_summary.rates.3U', 12.5)
            ->where('plk_cost_summary.rows.0.udm', 'UDM A')
            ->where('plk_cost_summary.rows.0.counts.3U', 2)
            ->where('plk_cost_summary.rows.0.total', 25)
            ->where('plk_cost_summary.rows.1.total', 100)
            ->where('plk_cost_summary.totals.counts.3U', 2)
            ->where('plk_cost_summary.totals.amounts.3B', 100)
            ->where('plk_cost_summary.totals.total', 125));

    $this->get(route('plk.index', ['tab' => 'kos']))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('cost_rows.0.total', 25)
            ->where('cost_rows.1.total', 100));
});

it('hides PLK cost data from laporan users without cost access', function () {
    $user = User::factory()->withModules(['laporan', 'plk'])->create();
    createLaporanPlkRecord();

    $this->actingAs($user)->get(route('laporan.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->where('plk_cost_summary', null));
});

it('limits the laporan PLK cost summary to the users voter scope', function () {
    $user = User::factory()->withModules(['laporan', 'plk', 'plk-kos'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM A',
    ]);
    Setting::setValue('plk_rates', json_encode(['3U' => 10]));
    createLaporanPlkRecord();
    createLaporanPlkRecord(['dm' => 'UDM B']);

    $this->actingAs($user)->get(route('laporan.index'))->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('plk_cost_summary.rows', 1)
            ->where('plk_cost_summary.rows.0.udm', 'UDM A')
            ->where('plk_cost_summary.totals.counts.3U', 1)
            ->where('plk_cost_summary.totals.total', 10));
});
