<?php

use App\Models\Cawangan;
use App\Models\PemilihBaruRecord;
use App\Models\PemilihRecord;
use App\Models\User;
use App\Services\PemilihBaruService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Inertia\Testing\AssertableInertia as Assert;

it('imports pemilih baharu into its own monthly table and transfers cula when the current file is imported', function () {
    $user = User::factory()->withModules(['settings', 'culaan.pemilih-baharu'])->create();

    PemilihRecord::query()->create([
        'identity_number' => '900101021234',
        'no_kp' => '900101021234',
        'name' => 'ALI PEMILIH BAHARU',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU',
        'gender' => 'L',
        'status' => 'aktif',
        'is_manual' => false,
    ]);

    $newVoterSheet = <<<'HTML'
<html><body><table>
<tr><td>Senarai pemilih baharu</td></tr>
<tr><th>Kod D.U.N.</th><th>No KP</th><th>ID Lain</th><th>Nama</th><th>Nama DM</th><th>Nama Lokaliti</th><th>Jantina</th><th>Transaksi</th><th>Kod Cula</th></tr>
<tr><td>24</td><td>90010102****</td><td></td><td>ALI PEMILIH BAHARU</td><td>PADANG CHICHAK</td><td>KG BARU</td><td>L</td><td>PENDAFTARAN BARU</td><td></td></tr>
<tr><td>23</td><td>88080802****</td><td></td><td>PEMILIH DUN LAIN</td><td>PADANG CHICHAK</td><td>KG BARU</td><td>L</td><td>PENDAFTARAN BARU</td><td></td></tr>
</table></body></html>
HTML;

    $this->actingAs($user)
        ->post(route('settings.pemilih-baru-upload'), [
            'pemilih_baru_file' => UploadedFile::fake()->createWithContent('pemilih-baru.xls', $newVoterSheet),
            'bulan' => '9',
            'tahun' => '2026',
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHas('success', fn (string $message): bool => str_contains($message, '1 rekod pemilih baharu dipadankan dengan data pemilih semasa')
            && str_contains($message, '1 rekod bukan Kod DUN 24 diabaikan'));

    $record = PemilihBaruRecord::query()->sole();
    expect($record->import_month)->toBe('2026-09')
        ->and($record->kod_dun)->toBe('24')
        ->and($record->no_kp)->toBe('90010102****')
        ->and($record->cula_code)->toBeNull()
        ->and($record->remark)->toBe('Dah link')
        ->and($record->linked_pemilih_record_id)->toBe(PemilihRecord::query()->firstOrFail()->id);

    $this->actingAs($user)
        ->post(route('pemilih-baru.cula.update', $record), ['cula_code' => '2', 'race' => 'Melayu'])
        ->assertRedirect(route('pemilih-baru.index', ['bulan' => '09', 'tahun' => '2026', 'semua_bulan' => 1]));

    expect($record->fresh()->cula_code)->toBe('2')
        ->and($record->fresh()->race)->toBe('Melayu');
    expect(PemilihRecord::query()->count())->toBe(1);

    $currentVoterSheet = <<<'HTML'
<html><body><table>
<tr><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Nama DM</th><th>Nama Lokaliti</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th></tr>
<tr><td>="900101021234"</td><td>ALI PEMILIH BAHARU</td><td>PADANG CHICHAK</td><td>KG BARU</td><td>L</td><td>M</td><td></td></tr>
</table></body></html>
HTML;

    $this->actingAs($user)
        ->post(route('settings.pemilih-upload'), [
            'pemilih_file' => UploadedFile::fake()->createWithContent('pemilih-semasa.xls', $currentVoterSheet),
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHas('success', fn (string $message): bool => str_contains($message, 'Fail pemilih berjaya dimuat naik'));

    expect($record->fresh()->remark)->toBe('Dah link')
        ->and($record->fresh()->linked_pemilih_record_id)->toBe(PemilihRecord::query()->firstOrFail()->id);

    $this->assertDatabaseHas('pemilih_records', [
        'identity_number' => '900101021234',
        'cula_code' => '2',
        'cula_display_label' => 'PAS',
    ]);

    File::delete(storage_path('app/reports/pemilih-latest.xls'));
});

it('copies a current pemilih cula code back to its linked new voter when the codes differ', function () {
    $user = User::factory()->withModules(['settings', 'culaan.pemilih-baharu'])->create();

    $record = PemilihBaruRecord::query()->create([
        'record_key' => sha1('linked-voter-different-cula'),
        'import_month' => '2026-09',
        'name' => 'ALI PEMILIH BAHARU',
        'no_kp' => '900101021234',
        'dm' => 'PADANG CHICHAK',
        'locality' => 'KG BARU',
        'gender' => 'L',
        'cula_code' => '2',
        'cula_display_label' => 'PAS',
    ]);

    $currentVoterSheet = <<<'HTML'
<html><body><table>
<tr><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Nama DM</th><th>Nama Lokaliti</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th></tr>
<tr><td>="900101021234"</td><td>ALI PEMILIH BAHARU</td><td>PADANG CHICHAK</td><td>KG BARU</td><td>L</td><td>M</td><td>1</td></tr>
</table></body></html>
HTML;

    $this->actingAs($user)
        ->post(route('settings.pemilih-upload'), [
            'pemilih_file' => UploadedFile::fake()->createWithContent('pemilih-semasa.xls', $currentVoterSheet),
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHas('success', fn (string $message): bool => str_contains($message, '1 rekod pemilih baharu berjaya di-link'));

    $currentVoter = PemilihRecord::query()->where('identity_number', '900101021234')->firstOrFail();
    expect($record->fresh()->cula_code)->toBe('1')
        ->and($record->fresh()->cula_display_label)->toBe('1 - UMNO')
        ->and($currentVoter->cula_code)->toBe('1');

    $this->actingAs($user)
        ->get(route('pemilih-baru.index', ['udm' => 'PADANG CHICHAK']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('records.data.0.is_linked', true)
            ->where('records.data.0.cula_code', '1'));

    File::delete(storage_path('app/reports/pemilih-latest.xls'));
});

it('reads an uploaded xlsx using its original extension and filters to DUN 24', function () {
    $user = User::factory()->withModules(['settings'])->create();
    $path = tempnam(sys_get_temp_dir(), 'pemilih-baru-upload-');
    $archive = new ZipArchive;
    expect($archive->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE))->toBeTrue();

    $rows = [
        ['Kod DUN', 'No KP', 'Nama', 'Nama DM', 'Nama Lokaliti', 'Jantina', 'Transaksi', 'Kod Cula'],
        ['24', '90010102****', 'PEMILIH DUN 24', 'UDM JENERI', 'LOKALITI 24', 'L', 'PENDAFTARAN BARU', ''],
        ['23', '88080802****', 'PEMILIH DUN 23', 'UDM LAIN', 'LOKALITI 23', 'P', 'PENDAFTARAN BARU', ''],
    ];
    $sheetRows = '';
    foreach ($rows as $rowIndex => $cells) {
        $rowNumber = $rowIndex + 1;
        $sheetRows .= '<row r="'.$rowNumber.'">';
        foreach ($cells as $columnIndex => $value) {
            $column = chr(ord('A') + $columnIndex);
            $cellValue = htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $sheetRows .= '<c r="'.$column.$rowNumber.'" t="inlineStr"><is><t>'.$cellValue.'</t></is></c>';
        }
        $sheetRows .= '</row>';
    }

    $archive->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    $archive->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    $archive->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
    $archive->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
    $archive->addFromString('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'.$sheetRows.'</sheetData></worksheet>');
    $archive->close();

    try {
        $response = $this->actingAs($user)
            ->post(route('settings.pemilih-baru-upload'), [
                'pemilih_baru_file' => new UploadedFile($path, 'KEDAH (DPT BLN1-2026).xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
                'bulan' => '1',
                'tahun' => '2026',
            ]);
        $response->assertRedirect(route('settings.edit'))
            ->assertSessionHas('success', fn ($message): bool => is_string($message) && str_contains($message, '1 rekod bukan Kod DUN 24 diabaikan'));

        $this->assertDatabaseHas('pemilih_baru_records', [
            'name' => 'PEMILIH DUN 24',
            'kod_dun' => '24',
            'import_month' => '2026-01',
        ]);
        $this->assertDatabaseMissing('pemilih_baru_records', ['name' => 'PEMILIH DUN 23']);
    } finally {
        File::delete($path);
    }
});

it('automatically assigns Melayu when the voter name has bin binti or bt', function () {
    $user = User::factory()->withModules(['settings'])->create();
    $sheet = <<<'HTML'
<html><body><table>
<tr><th>Kod DUN</th><th>No KP</th><th>Nama</th><th>Nama DM</th><th>Nama Lokaliti</th><th>Jantina</th><th>Transaksi</th><th>Kod Cula</th></tr>
<tr><td>24</td><td>80010102****</td><td>MOHD BIN AHMAD</td><td>UDM A</td><td>LOKALITI A</td><td>L</td><td>PENDAFTARAN BARU</td><td></td></tr>
<tr><td>24</td><td>85020202****</td><td>SITI BINTI ALI</td><td>UDM A</td><td>LOKALITI A</td><td>P</td><td>PENDAFTARAN BARU</td><td></td></tr>
<tr><td>24</td><td>82030302****</td><td>AHMAD BT OSMAN</td><td>UDM A</td><td>LOKALITI A</td><td>L</td><td>PENDAFTARAN BARU</td><td></td></tr>
<tr><td>24</td><td>90040402****</td><td>ALI TANPA PENANDA</td><td>UDM A</td><td>LOKALITI A</td><td>L</td><td>PENDAFTARAN BARU</td><td></td></tr>
</table></body></html>
HTML;

    $upload = fn () => UploadedFile::fake()->createWithContent('pemilih-bangsa.xls', $sheet);

    $this->actingAs($user)
        ->post(route('settings.pemilih-baru-upload'), [
            'pemilih_baru_file' => $upload(),
            'bulan' => '9',
            'tahun' => '2026',
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas('pemilih_baru_records', ['name' => 'MOHD BIN AHMAD', 'race' => 'Melayu']);
    $this->assertDatabaseHas('pemilih_baru_records', ['name' => 'SITI BINTI ALI', 'race' => 'Melayu']);
    $this->assertDatabaseHas('pemilih_baru_records', ['name' => 'AHMAD BT OSMAN', 'race' => 'Melayu']);
    $this->assertDatabaseHas('pemilih_baru_records', ['name' => 'ALI TANPA PENANDA', 'race' => null]);

    $unmarked = PemilihBaruRecord::query()->where('name', 'ALI TANPA PENANDA')->firstOrFail();
    $unmarked->update(['race' => 'Bukan Melayu', 'cula_code' => '2']);

    $this->actingAs($user)
        ->post(route('settings.pemilih-baru-upload'), [
            'pemilih_baru_file' => $upload(),
            'bulan' => '9',
            'tahun' => '2026',
        ])
        ->assertRedirect(route('settings.edit'));

    expect($unmarked->fresh()->race)->toBe('Bukan Melayu')
        ->and($unmarked->fresh()->cula_code)->toBe('2');
});

it('shows the pemilih baharu cula menu with all months selected by default', function () {
    $user = User::factory()->withModules(['culaan.pemilih-baharu'])->create();
    Carbon\Carbon::setTestNow('2026-10-08 12:00:00');

    $this->actingAs($user)
        ->get(route('pemilih-baru.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('PemilihBaru/Index')
            ->where('filters.bulan', '09')
            ->where('filters.tahun', '2026')
            ->where('filters.semua_bulan', true)
            ->where('summary.total', 0)
            ->where('can_select_udm', true)
            ->where('filters.udm', '')
            ->where('records.data', []));

    Carbon\Carbon::setTestNow();
});

it('requires UDM selection before showing new voter records and shows the pending menu badge', function () {
    $user = User::factory()->withModules(['culaan.pemilih-baharu'])->create();
    Carbon\Carbon::setTestNow('2026-10-08 12:00:00');

    PemilihBaruRecord::query()->create([
        'record_key' => sha1('alpha-pending'),
        'import_month' => '2026-09',
        'name' => 'ALI BELUM CULA',
        'no_kp' => '900101******',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI A',
        'birth_year' => 1980,
    ]);
    PemilihBaruRecord::query()->create([
        'record_key' => sha1('alpha-done'),
        'import_month' => '2026-09',
        'name' => 'SITI SUDAH CULA',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI A',
        'cula_code' => '2',
    ]);
    PemilihBaruRecord::query()->create([
        'record_key' => sha1('beta-pending'),
        'import_month' => '2026-09',
        'name' => 'ABU BELUM CULA',
        'dm' => 'UDM BETA',
        'locality' => 'LOKALITI B',
    ]);
    PemilihBaruRecord::query()->create([
        'record_key' => sha1('alpha-previous-month'),
        'import_month' => '2026-08',
        'name' => 'ZUL CULA BULAN LEPAS',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI A',
        'cula_code' => '3B',
    ]);

    $this->actingAs($user)
        ->get(route('pemilih-baru.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.udm', '')
            ->where('filters.semua_bulan', true)
            ->where('records.data', [])
            ->where('udm_summaries.0.name', 'UDM ALPHA')
            ->where('udm_summaries.0.total', 3)
            ->where('udm_summaries.0.completed', 2)
            ->where('badgeCounts.culaPemilihBaruBelumCula', 2));

    $this->actingAs($user)
        ->get(route('pemilih-baru.index', ['udm' => 'UDM ALPHA']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.udm', 'UDM ALPHA')
            ->where('filters.semua_bulan', true)
            ->where('summary.total', 3)
            ->where('records.data.0.name', 'ALI BELUM CULA')
            ->where('records.data.0.umur', 36));

    $this->actingAs($user)
        ->get(route('pemilih-baru.index', ['udm' => 'UDM ALPHA', 'semua_bulan' => 0]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.semua_bulan', false)
            ->where('summary.total', 2));

    $this->actingAs($user)
        ->get(route('pemilih-baru.index', ['udm' => 'UDM ALPHA', 'semua_bulan' => 1]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.semua_bulan', true)
            ->where('summary.total', 3)
            ->where('summary.completed', 2)
            ->where('records.total', 3)
            ->where('records.data.2.import_month', '2026-08'));

    Carbon\Carbon::setTestNow();
});

it('limits pemilih baharu cula to the assigned UDM and auto-selects that UDM', function () {
    $user = User::factory()->withModules(['culaan.pemilih-baharu'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM ALPHA',
    ]);

    foreach ([
        ['alpha', 'UDM ALPHA', 'LOKALITI A', 'PEMILIH UDM SENDIRI'],
        ['beta', 'UDM BETA', 'LOKALITI B', 'PEMILIH UDM LAIN'],
    ] as [$key, $udm, $locality, $name]) {
        PemilihBaruRecord::query()->create([
            'record_key' => sha1($key),
            'import_month' => '2026-09',
            'name' => $name,
            'dm' => $udm,
            'locality' => $locality,
        ]);
    }

    $this->actingAs($user)
        ->get(route('pemilih-baru.index', ['udm' => 'UDM BETA']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.udm', 'UDM ALPHA')
            ->where('can_select_udm', false)
            ->where('can_select_locality', true)
            ->where('udms', ['UDM ALPHA'])
            ->where('summary.total', 1)
            ->where('records.data.0.name', 'PEMILIH UDM SENDIRI'));
});

it('limits cawangan access to its own locality and fixes the UDM and locality filters', function () {
    $cawangan = Cawangan::query()->create(['name' => 'CAWANGAN SENDIRI', 'udm' => 'UDM ALPHA']);
    $user = User::factory()->withModules(['culaan.pemilih-baharu'])->create([
        'access_level' => 'cawangan',
        'scope_key' => (string) $cawangan->id,
    ]);

    foreach ([
        ['own', 'UDM ALPHA', 'CAWANGAN SENDIRI', 'PEMILIH CAWANGAN SENDIRI'],
        ['other-locality', 'UDM ALPHA', 'CAWANGAN LAIN', 'PEMILIH CAWANGAN LAIN'],
        ['other-udm', 'UDM BETA', 'CAWANGAN BETA', 'PEMILIH UDM LAIN'],
    ] as [$key, $udm, $locality, $name]) {
        PemilihBaruRecord::query()->create([
            'record_key' => sha1($key),
            'import_month' => '2026-09',
            'name' => $name,
            'dm' => $udm,
            'locality' => $locality,
        ]);
    }

    $this->actingAs($user)
        ->get(route('pemilih-baru.index', ['udm' => 'UDM BETA', 'locality' => 'CAWANGAN LAIN']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.udm', 'UDM ALPHA')
            ->where('filters.locality', 'CAWANGAN SENDIRI')
            ->where('can_select_udm', false)
            ->where('can_select_locality', false)
            ->where('localities', ['CAWANGAN SENDIRI'])
            ->where('summary.total', 1)
            ->where('records.data.0.name', 'PEMILIH CAWANGAN SENDIRI')
            ->where('badgeCounts.culaPemilihBaruBelumCula', 1));

    $outsideRecord = PemilihBaruRecord::query()->where('name', 'PEMILIH CAWANGAN LAIN')->firstOrFail();

    $this->actingAs($user)
        ->postJson(route('pemilih-baru.cula.update', $outsideRecord), [
            'cula_code' => '2',
            'race' => 'Melayu',
        ])
        ->assertForbidden();
});

it('requires the dedicated role permission for pemilih baharu cula', function () {
    $user = User::factory()->withModules(['culaan.senarai'])->create();

    $this->actingAs($user)
        ->get(route('pemilih-baru.index'))
        ->assertRedirect(route('profile.edit', absolute: false));
});

it('lists pemilih baharu imports and only deletes a batch after typing delete', function () {
    $user = User::factory()->withModules(['settings'])->create();

    PemilihBaruRecord::query()->create([
        'record_key' => sha1('mistaken-upload'),
        'import_month' => '2026-09',
        'name' => 'REKOD IMPORT TERSILAP',
        'source_file' => 'pemilih-tersilap.xlsx',
        'imported_by' => 'Penyelia',
    ]);
    PemilihBaruRecord::query()->create([
        'record_key' => sha1('valid-upload'),
        'import_month' => '2026-08',
        'name' => 'REKOD IMPORT BETUL',
        'source_file' => 'pemilih-betul.xlsx',
        'imported_by' => 'Penyelia',
    ]);

    $this->actingAs($user)
        ->get(route('settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('settings.pemilih_baru.imports.0.source_file', 'pemilih-tersilap.xlsx')
            ->where('settings.pemilih_baru.imports.0.record_count', 1));

    $this->actingAs($user)
        ->from(route('settings.edit'))
        ->post(route('settings.pemilih-baru-imports.destroy'), [
            'source_file' => 'pemilih-tersilap.xlsx',
            'import_month' => '2026-09',
            'confirmation' => 'padam',
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHasErrors('confirmation');

    $this->actingAs($user)
        ->from(route('settings.edit'))
        ->post(route('settings.pemilih-baru-imports.destroy'), [
            'source_file' => 'pemilih-tersilap.xlsx',
            'import_month' => '2026-09',
            'confirmation' => 'DELETE',
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('pemilih_baru_records', ['record_key' => sha1('mistaken-upload')]);
    $this->assertDatabaseHas('pemilih_baru_records', ['record_key' => sha1('valid-upload')]);
});

it('builds monthly new voter report groups from transaction, cula code and bangsa', function () {
    Carbon\Carbon::setTestNow('2026-10-08 12:00:00');

    $records = [
        [
            'record_key' => sha1('report-new-known-malay'),
            'name' => 'PENGUNDI BARU MELAYU DIKENALI',
            'no_kp' => '08010102****',
            'transaction' => 'PENDAFTARAN BARU',
            'cula_code' => '2',
            'race' => 'Melayu',
        ],
        [
            'record_key' => sha1('report-new-unknown-non-malay'),
            'name' => 'PENGUNDI BARU BUKAN MELAYU TIDAK DIKENALI',
            'no_kp' => '05010102****',
            'transaction' => 'PENDAFTARAN BARU',
            'cula_code' => '7P',
            'race' => 'Bukan Melayu',
        ],
        [
            'record_key' => sha1('report-new-underage'),
            'name' => 'PENGUNDI BARU BAWAH UMUR',
            'no_kp' => '09010102****',
            'transaction' => 'PENDAFTARAN BARU',
            'cula_code' => '2',
            'race' => 'Melayu',
        ],
        [
            'record_key' => sha1('report-move-in'),
            'name' => 'PEMILIH PINDAH MASUK',
            'transaction' => 'PERTUKARAN BAHAGIAN PILIHAN RAYA',
            'cula_code' => '7',
            'race' => 'Melayu',
        ],
        [
            'record_key' => sha1('report-move-out'),
            'name' => 'PEMILIH PINDAH KELUAR',
            'transaction' => 'PENANDAAN PEMOTONGAN - PEMILIH BERTUKAR ALAMAT (KELUAR)',
            'cula_code' => '2',
            'race' => 'Bukan Melayu',
        ],
    ];

    foreach ($records as $record) {
        PemilihBaruRecord::query()->create([
            ...$record,
            'import_month' => '2026-09',
        ]);
    }

    $report = app(PemilihBaruService::class)->monthlyMovementReport();
    $september = collect($report['rows'])->firstWhere('key', '2026-09');

    expect($report['year'])->toBe(2026)
        ->and($september['jumlah_pemilih'])->toBe(5)
        ->and($september['pengundi_baru_total'])->toBe(2)
        ->and($september['pengundi_baru_dikenali_melayu'])->toBe(1)
        ->and($september['pengundi_baru_tidak_dikenali_bukan_melayu'])->toBe(1)
        ->and($september['pengundi_baru_cula_b'])->toBe('')
        ->and($september['pindah_masuk_total'])->toBe(1)
        ->and($september['pindah_masuk_tidak_dikenali_melayu'])->toBe(1)
        ->and($september['pindah_keluar_total'])->toBe(1)
        ->and($september['pindah_keluar_dikenali_bukan_melayu'])->toBe(1);

    Carbon\Carbon::setTestNow();
});
