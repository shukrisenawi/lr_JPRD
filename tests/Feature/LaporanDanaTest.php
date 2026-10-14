<?php

use App\Models\Cawangan;
use App\Models\Dana;
use App\Models\DanaKategori;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Support\Str;

function laporanDanaRecord(string $udm, string $jenis, string $jumlah, string $categoryName = 'BAYARAN DUIT PERALATAN PILIHANRAYA PRU16'): Dana
{
    $category = DanaKategori::query()->firstOrCreate(['name' => $categoryName]);

    return Dana::query()->create([
        'udm' => $udm, 'kategori_id' => $category->id, 'jenis' => $jenis, 'jumlah' => $jumlah,
        'tarikh' => '2026-10-14', 'keterangan' => 'Transaksi laporan dana',
    ]);
}

it('charts received payments recorded as incoming funds for the PRU16 equipment category only', function () {
    $user = User::factory()->withModules(['laporan', 'dana'])->create();
    laporanDanaRecord('UDM A', 'keluar', '500.25');
    laporanDanaRecord('UDM A', 'masuk', '125.50');
    laporanDanaRecord('UDM B', 'masuk', '30.10');
    laporanDanaRecord('UDM A', 'masuk', '999.00', 'Sumbangan Ujian');
    laporanDanaRecord('UDM A', 'masuk', '888.00', 'BAYARAN DUIT PERALATAN PILIHANRAYA PRU15');
    PemilihRecord::query()->create([
        'identity_number' => (string) Str::uuid(), 'name' => 'PEMILIH DANA',
        'dm' => 'UDM C', 'status' => 'aktif', 'is_manual' => false,
    ]);

    $this->actingAs($user)->get(route('laporan.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->component('Laporan')->has('dana_summary.rows', 3)
        ->where('dana_summary.category', 'BAYARAN DUIT PERALATAN PILIHANRAYA PRU16')
        ->where('dana_summary.rows.0.udm', 'UDM A')
        ->where('dana_summary.rows.0.count', 1)
        ->where('dana_summary.rows.0.total_bayaran', '125.50')
        ->where('dana_summary.rows.1.total_bayaran', '30.10')
        ->where('dana_summary.rows.2.count', 0)
        ->where('dana_summary.rows.2.total_bayaran', '0.00')
        ->where('dana_summary.totals.count', 2)
        ->where('dana_summary.totals.total_bayaran', '155.60'));
    $this->get(route('dana.index'))->assertInertia(fn ($page) => $page
        ->where('totals.total_masuk', '2042.60')->where('totals.total_keluar', '500.25')
        ->where('totals.baki', '1542.35'));
});

it('does not expose financial data without Dana module access', function () {
    $user = User::factory()->withModules(['laporan'])->create();
    laporanDanaRecord('UDM A', 'masuk', '123.45');
    $this->actingAs($user)->get(route('laporan.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->where('dana_summary', null));
});

it('limits financial summaries to the same UDM scope as the Dana menu', function (string $level) {
    $cawangan = Cawangan::query()->create(['name' => 'CAWANGAN A', 'udm' => 'UDM A']);
    $user = User::factory()->withModules(['laporan', 'dana'])->create([
        'access_level' => $level, 'scope_key' => $level === 'cawangan' ? (string) $cawangan->id : 'UDM A',
    ]);
    laporanDanaRecord('UDM A', 'masuk', '10.25');
    laporanDanaRecord('UDM B', 'masuk', '999.00');
    $this->actingAs($user)->get(route('laporan.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->has('dana_summary.rows', 1)->where('dana_summary.rows.0.udm', 'UDM A')
        ->where('dana_summary.totals.total_bayaran', '10.25')->where('dana_summary.totals.count', 1));
})->with(['udm', 'cawangan']);

it('returns an empty financial summary with zero totals when no data exists', function () {
    $user = User::factory()->withModules(['laporan', 'dana'])->create();
    $this->actingAs($user)->get(route('laporan.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->has('dana_summary.rows', 0)->where('dana_summary.totals.count', 0)
        ->where('dana_summary.totals.total_bayaran', '0.00'));
});

it('matches the requested category regardless of case or surrounding whitespace without matching other names', function () {
    $user = User::factory()->withModules(['laporan', 'dana'])->create();
    laporanDanaRecord('UDM A', 'masuk', '12.34', '  bayaran duit peralatan pilihanraya pru16  ');
    laporanDanaRecord('UDM A', 'masuk', '100.00', 'LAIN-LAIN BAYARAN DUIT PERALATAN PILIHANRAYA PRU16');
    $this->actingAs($user)->get(route('laporan.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->where('dana_summary.totals.count', 1)->where('dana_summary.totals.total_bayaran', '12.34'));
});
