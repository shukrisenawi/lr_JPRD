<?php

use App\Models\Cawangan;
use App\Models\Dana;
use App\Models\DanaKategori;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Support\Str;

function laporanDanaRecord(string $udm, string $jenis, string $jumlah): Dana
{
    $category = DanaKategori::query()->firstOrCreate(['name' => 'Sumbangan Ujian']);

    return Dana::query()->create([
        'udm' => $udm, 'kategori_id' => $category->id, 'jenis' => $jenis, 'jumlah' => $jumlah,
        'tarikh' => '2026-10-14', 'keterangan' => 'Transaksi laporan dana',
    ]);
}

it('shows incoming outgoing and balance totals matching the Dana menu with zero-data UDMs', function () {
    $user = User::factory()->withModules(['laporan', 'dana'])->create();
    laporanDanaRecord('UDM A', 'masuk', '500.25');
    laporanDanaRecord('UDM A', 'keluar', '125.50');
    laporanDanaRecord('UDM B', 'keluar', '30.10');
    PemilihRecord::query()->create([
        'identity_number' => (string) Str::uuid(), 'name' => 'PEMILIH DANA',
        'dm' => 'UDM C', 'status' => 'aktif', 'is_manual' => false,
    ]);

    $this->actingAs($user)->get(route('laporan.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->component('Laporan')->has('dana_summary.rows', 3)
        ->where('dana_summary.rows.0.udm', 'UDM A')
        ->where('dana_summary.rows.0.count', 2)
        ->where('dana_summary.rows.0.total_masuk', '500.25')
        ->where('dana_summary.rows.0.total_keluar', '125.50')
        ->where('dana_summary.rows.0.baki', '374.75')
        ->where('dana_summary.rows.1.baki', '-30.10')
        ->where('dana_summary.rows.2.count', 0)
        ->where('dana_summary.rows.2.baki', '0.00')
        ->where('dana_summary.totals.count', 3)
        ->where('dana_summary.totals.total_masuk', '500.25')
        ->where('dana_summary.totals.total_keluar', '155.60')
        ->where('dana_summary.totals.baki', '344.65'));
    $this->get(route('dana.index'))->assertInertia(fn ($page) => $page
        ->where('totals.total_masuk', '500.25')->where('totals.total_keluar', '155.60')
        ->where('totals.baki', '344.65'));
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
        ->where('dana_summary.totals.total_masuk', '10.25')->where('dana_summary.totals.count', 1));
})->with(['udm', 'cawangan']);

it('returns an empty financial summary with zero totals when no data exists', function () {
    $user = User::factory()->withModules(['laporan', 'dana'])->create();
    $this->actingAs($user)->get(route('laporan.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->has('dana_summary.rows', 0)->where('dana_summary.totals.count', 0)
        ->where('dana_summary.totals.baki', '0.00'));
});
