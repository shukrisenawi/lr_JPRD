<?php

use App\Models\Cawangan;
use App\Models\PemilihBaruRecord;
use App\Models\PemilihRecord;
use App\Models\User;

function readDptExport($response): array
{
    $response->assertOk()->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $path = $response->baseResponse->getFile()->getPathname();
    $zip = new ZipArchive;
    expect($zip->open($path))->toBeTrue();
    $files = [];
    for ($index = 0; $index < $zip->numFiles; $index++) {
        $name = $zip->getNameIndex($index);
        $xml = $zip->getFromIndex($index);
        expect(simplexml_load_string($xml))->not->toBeFalse();
        $files[$name] = $xml;
    }
    $zip->close();
    unlink($path);

    return $files;
}

function createDptRecord(array $attributes = []): PemilihBaruRecord
{
    return PemilihBaruRecord::query()->create(array_merge([
        'record_key' => sha1(uniqid('', true)), 'import_month' => '2026-09',
        'dm' => 'ALPHA', 'locality' => 'KG A', 'name' => 'NAMA UJIAN',
        'no_kp' => '010101020001', 'transaction' => 'PENDAFTARAN BARU', 'no_rumah' => '001A',
    ], $attributes));
}

it('exports all matching pages grouped by udm and locality sorted by ascending age in portrait', function () {
    $user = User::factory()->withModules(['culaan.pemilih-baharu'])->create();
    createDptRecord(['dm' => 'BETA', 'name' => 'UDM KEDUA']);
    createDptRecord(['locality' => 'KG B', 'name' => 'LOKALITI KEDUA']);
    createDptRecord(['no_kp' => '020101020001', 'name' => 'KP KEMUDIAN']);
    createDptRecord(['no_kp' => '000101020001', 'name' => '=NAMA & <AWAL>']);
    for ($index = 0; $index < 31; $index++) {
        createDptRecord(['name' => 'REKOD '.$index]);
    }

    $files = readDptExport($this->actingAs($user)->get(route('pemilih-baru.export')));
    $xml = $files['xl/worksheets/sheet1.xml'];
    expect($xml)->toContain('DPT UDM ALPHA', 'DPT UDM BETA', 'LOKALITI: KG A', 'LOKALITI: KG B',
        'Bil', 'Nama', 'Transaksi', 'No KP', 'Umur', 'No Rumah', '001A', '000101020001',
        'orientation="portrait"', 'paperSize="9"', 'fitToWidth="1"', 'fitToHeight="0"',
        '<rowBreaks count="1" manualBreakCount="1">', '=NAMA &amp; &lt;AWAL&gt;', 'REKOD 30')
        ->not->toContain('<f>');
    expect(strpos($xml, 'KP KEMUDIAN'))->toBeLessThan(strpos($xml, '=NAMA'));
    expect(strpos($xml, 'KP KEMUDIAN'))->toBeLessThan(strpos($xml, 'LOKALITI: KG B'));
    expect(strpos($xml, 'LOKALITI: KG B'))->toBeLessThan(strpos($xml, 'DPT UDM BETA'));
    expect($xml)->toContain('showGridLines="0"', 'r="A1" s="1"', 'r="A2" s="2"', 'r="A3" s="3"', 'r="A4" s="4"');
    $styles = simplexml_load_string($files['xl/styles.xml']);
    expect((string) $styles->cellXfs->xf[0]['borderId'])->toBe('0');
    expect((string) $styles->cellXfs->xf[1]['borderId'])->toBe('0');
    expect((string) $styles->cellXfs->xf[2]['borderId'])->toBe('0');
    expect((string) $styles->cellXfs->xf[3]['borderId'])->toBe('1');
    expect((string) $styles->cellXfs->xf[4]['borderId'])->toBe('1');
});

it('uses month locality and search filters but always exports only unlinked records', function () {
    $user = User::factory()->withModules(['culaan.pemilih-baharu'])->create();
    createDptRecord(['name' => 'SASARAN']);
    createDptRecord(['name' => 'SASARAN BULAN LAIN', 'import_month' => '2026-08']);
    createDptRecord(['name' => 'SASARAN LOKALITI LAIN', 'locality' => 'KG B']);
    createDptRecord(['name' => 'BUKAN CARIAN']);
    $xml = readDptExport($this->actingAs($user)->get(route('pemilih-baru.export', [
        'udm' => 'ALPHA', 'locality' => 'KG A', 'q' => 'SASARAN',
        'semua_bulan' => 0, 'bulan' => 9, 'tahun' => 2026, 'tab' => 'belum_link',
    ])))['xl/worksheets/sheet1.xml'];
    expect($xml)->toContain('SASARAN')->not->toContain('SASARAN BULAN LAIN', 'SASARAN LOKALITI LAIN', 'BUKAN CARIAN');
    $linked = PemilihRecord::query()->create([
        'identity_number' => '900101021234', 'name' => 'PEMILIH LINK', 'dm' => 'ALPHA',
        'locality' => 'KG A', 'status' => 'aktif', 'is_manual' => false,
    ]);
    createDptRecord(['name' => 'JANGAN EKSPORT LINK', 'linked_pemilih_record_id' => $linked->id]);
    $unlinked = readDptExport($this->get(route('pemilih-baru.export', ['tab' => 'dah_link'])))['xl/worksheets/sheet1.xml'];
    expect($unlinked)->toContain('SASARAN')->not->toContain('JANGAN EKSPORT LINK');
    $empty = readDptExport($this->get(route('pemilih-baru.export', ['q' => 'TIADA PADANAN'])))['xl/worksheets/sheet1.xml'];
    expect($empty)->toContain('Tiada rekod');
});

it('enforces locality and udm scope even when export filters are tampered with', function () {
    $cawangan = Cawangan::query()->create(['name' => 'KG A', 'udm' => 'ALPHA']);
    $user = User::factory()->withModules(['culaan.pemilih-baharu'])->create([
        'access_level' => 'cawangan', 'scope_key' => (string) $cawangan->id,
    ]);
    createDptRecord(['name' => 'DIBENARKAN']);
    createDptRecord(['name' => 'RAHSIA UDM', 'dm' => 'BETA']);
    createDptRecord(['name' => 'RAHSIA LOKALITI', 'locality' => 'KG B']);
    $xml = readDptExport($this->actingAs($user)->get(route('pemilih-baru.export', [
        'udm' => 'BETA', 'locality' => 'KG B',
    ])))['xl/worksheets/sheet1.xml'];
    expect($xml)->toContain('DIBENARKAN')->not->toContain('RAHSIA');
});

it('requires authentication for excel exports', function () {
    $this->get(route('pemilih-baru.export'))->assertRedirect(route('login'));
});

it('requires module permission for excel exports', function () {
    $user = User::factory()->withModules([])->create(['must_change_password' => false]);
    $this->actingAs($user)->getJson(route('pemilih-baru.export'))->assertForbidden();
});
