<?php

use App\Models\Setting;
use App\Models\User;
use App\Services\PemilihReportService;
use Illuminate\Http\UploadedFile;

function pemilihReportFixture(): string
{
    return <<<'HTML'
<html><body><table>
<tr><th>Bil.</th><th>Kod DM</th><th>Nama DM</th><th>Kod Lokaliti</th><th>Nama Lokaliti</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th></tr>
<tr><td>1</td><td>="01"</td><td>PADANG CHICHAK</td><td>="001"</td><td>KG BARU KURA</td><td>P</td><td>M</td><td>2 </td></tr>
<tr><td>2</td><td>="01"</td><td>PADANG CHICHAK</td><td>="001"</td><td>KG BARU KURA</td><td>L</td><td>C</td><td></td></tr>
<tr><td>3</td><td>="02"</td><td>KAMPUNG BETONG</td><td>="002"</td><td>KG BETONG</td><td>L</td><td>M</td><td>3P</td></tr>
<tr><td>4</td><td>="02"</td><td>KAMPUNG BETONG</td><td>="003"</td><td>KG BATU BESAR</td><td>P</td><td>I</td><td>2</td></tr>
</table></body></html>
HTML;
}

it('builds pemilih report summary from html xls data', function () {
    $path = storage_path('app/testing-pemilih.xls');
    file_put_contents($path, pemilihReportFixture());

    $report = app(PemilihReportService::class)->buildFromPath($path);

    expect($report['summary']['total_voters'])->toBe(4)
        ->and($report['summary']['total_dm'])->toBe(2)
        ->and($report['summary']['total_localities'])->toBe(3)
        ->and($report['summary']['male'])->toBe(2)
        ->and($report['summary']['female'])->toBe(2)
        ->and($report['summary']['with_cula'])->toBe(3)
        ->and($report['summary']['belum_dicula'])->toBe(1)
        ->and($report['summary']['coverage_percent'])->toBe(75.0)
        ->and($report['by_dm'][0]['name'])->toBe('KAMPUNG BETONG')
        ->and($report['by_dm'][0]['key'])->toBe('02|KAMPUNG BETONG')
        ->and($report['by_dm'][0]['total'])->toBe(2)
        ->and($report['by_dm'][0]['belum_dicula'])->toBe(0)
        ->and($report['by_dm'][0]['coverage_percent'])->toBe(100.0)
        ->and($report['cula_by_dm'][0]['name'])->toBe('KAMPUNG BETONG')
        ->and($report['cula_by_dm'][0]['cula_breakdown'][0]['code'])->toBe('2')
        ->and($report['cula_by_dm'][0]['cula_breakdown'][0]['label'])->toBe('2 - PAS')
        ->and($report['cula_by_dm'][0]['cula_breakdown'][0]['total'])->toBe(1)
        ->and($report['dm_details'][0]['name'])->toBe('KAMPUNG BETONG')
        ->and($report['dm_details'][0]['key'])->toBe('02|KAMPUNG BETONG')
        ->and($report['dm_details'][0]['summary']['total_localities'])->toBe(2)
        ->and($report['dm_details'][0]['summary']['belum_dicula'])->toBe(0)
        ->and($report['dm_details'][0]['summary']['coverage_percent'])->toBe(100.0)
        ->and($report['dm_details'][0]['race_breakdown'][0]['code'])->toBe('I')
        ->and($report['dm_details'][0]['localities'][0]['cula_breakdown'][0]['code'])->toBe('2')
        ->and($report['dm_details'][1]['localities'][0]['cula_breakdown'][1]['display_label'])->toBe('? - BELUM DICULA')
        ->and($report['by_cula'][0]['code'])->toBe('2')
        ->and($report['by_cula'][0]['display_label'])->toBe('2 - PAS')
        ->and($report['by_cula'][0]['total'])->toBe(2);
});

it('renders laporan page with pemilih report data', function () {
    $user = User::factory()->create();
    $path = storage_path('app/testing-pemilih-page.xls');
    file_put_contents($path, pemilihReportFixture());
    Setting::setValue('pemilih_report_file_path', $path);

    $this->actingAs($user)
        ->get('/laporan')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Laporan')
            ->where('report.summary.total_voters', 4)
            ->where('report.summary.with_cula', 3)
            ->where('report.summary.belum_dicula', 1)
            ->where('report.summary.coverage_percent', 75)
            ->where('report.by_dm.0.name', 'KAMPUNG BETONG')
            ->where('report.by_dm.0.key', '02|KAMPUNG BETONG')
            ->where('report.cula_by_dm.0.cula_breakdown.0.code', '2')
            ->where('report.cula_by_dm.0.cula_breakdown.0.display_label', '2 - PAS')
            ->where('report.dm_details.0.summary.total_localities', 2));
});

it('renders carian pemilih page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/carian-pemilih')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('CarianPemilih'));
});

it('stores uploaded pemilih file for laporan', function () {
    $user = User::factory()->create();
    $path = storage_path('app/testing-upload-pemilih.xls');
    file_put_contents($path, pemilihReportFixture());
    $file = new UploadedFile($path, 'pemilih.xls', 'application/vnd.ms-excel', null, true);

    $this->actingAs($user)
        ->post('/laporan/upload', [
            'pemilih_file' => $file,
        ])
        ->assertRedirect(route('laporan.index'));

    $storedPath = Setting::valueOf('pemilih_report_file_path');

    expect($storedPath)->not->toBeNull()
        ->and(file_exists($storedPath))->toBeTrue();
});

it('returns voter suggestions by name ic and phone for laporan search', function () {
    $user = User::factory()->create();
    $path = storage_path('app/testing-pemilih-search.xls');
    file_put_contents($path, <<<'HTML'
<html><body><table>
<tr><th>Bil.</th><th>Kod DM</th><th>Nama DM</th><th>Kod Lokaliti</th><th>Nama Lokaliti</th><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th><th>Alamat Kediaman</th><th>Tel. Rumah</th><th>Tel. Bimbit</th></tr>
<tr><td>1</td><td>="01"</td><td>PADANG CHICHAK</td><td>="001"</td><td>KG BARU KURA</td><td>="900101025555"</td><td>ALI BIN ABU</td><td>L</td><td>M</td><td>2</td><td>KG BARU KURA</td><td>="049999999"</td><td>="0123456789"</td></tr>
<tr><td>2</td><td>="02"</td><td>KAMPUNG BETONG</td><td>="002"</td><td>KG BETONG</td><td>="880808025333"</td><td>SITI AMINAH</td><td>P</td><td>M</td><td>3P</td><td>KG BETONG</td><td>="047777777"</td><td>="0198888777"</td></tr>
</table></body></html>
HTML);
    Setting::setValue('pemilih_report_file_path', $path);
    app(PemilihReportService::class)->buildFromPath($path);

    $this->actingAs($user)
        ->getJson('/carian-pemilih/search?q=ali')
        ->assertOk()
        ->assertJsonPath('suggestions.0.name', 'ALI BIN ABU')
        ->assertJsonPath('suggestions.0.no_kp', '900101025555')
        ->assertJsonPath('suggestions.0.phone_mobile', '0123456789');

    $this->actingAs($user)
        ->getJson('/carian-pemilih/search?q=0198888777')
        ->assertOk()
        ->assertJsonPath('suggestions.0.name', 'SITI AMINAH');
});

it('rebuilds cached laporan data when source file changes', function () {
    $path = storage_path('app/testing-pemilih-cache.xls');
    file_put_contents($path, pemilihReportFixture());

    $service = app(PemilihReportService::class);
    $first = $service->buildFromPath($path);

    sleep(1);

    file_put_contents($path, str_replace(
        '<tr><td>4</td><td>="02"</td><td>KAMPUNG BETONG</td><td>="003"</td><td>KG BATU BESAR</td><td>P</td><td>I</td><td>2</td></tr>',
        '<tr><td>4</td><td>="02"</td><td>KAMPUNG BETONG</td><td>="003"</td><td>KG BATU BESAR</td><td>P</td><td>I</td><td>10</td></tr>',
        pemilihReportFixture(),
    ));

    $second = $service->buildFromPath($path);

    expect($first['by_cula'][0]['code'])->toBe('2')
        ->and(collect($second['by_cula'])->contains(fn (array $row) => $row['code'] === '10' && $row['total'] === 1))->toBeTrue();
});

it('rebuilds legacy laporan cache with old structure automatically', function () {
    $path = storage_path('app/testing-pemilih-legacy-cache.xls');
    file_put_contents($path, pemilihReportFixture());

    $legacyReport = [
        'source' => [
            'name' => basename($path),
            'exists' => true,
        ],
        'summary' => [
            'total_voters' => 999,
            'total_dm' => 1,
            'total_localities' => 1,
            'male' => 0,
            'female' => 0,
            'other_gender' => 0,
            'with_cula' => 0,
        ],
        'gender' => [],
        'by_dm' => [],
        'cula_by_dm' => [],
        'dm_details' => [],
        'by_locality' => [],
        'by_cula' => [],
    ];

    $cacheSignature = sha1(implode('|', [
        $path,
        (string) filemtime($path),
        (string) filesize($path),
    ]));
    $legacyCachePath = storage_path('app/report-cache/' . $cacheSignature . '.json');
    $reportCachePath = storage_path('app/report-cache/' . $cacheSignature . '-report.json');

    if (! is_dir(dirname($legacyCachePath))) {
        mkdir(dirname($legacyCachePath), 0777, true);
    }

    file_put_contents($legacyCachePath, json_encode($legacyReport, JSON_UNESCAPED_UNICODE));

    $report = app(PemilihReportService::class)->buildFromPath($path);
    $rebuiltCache = json_decode(file_get_contents($reportCachePath), true);

    expect($report['summary']['total_voters'])->toBe(4)
        ->and($rebuiltCache)->toBeArray()
        ->and($rebuiltCache['summary']['total_voters'])->toBe(4);
});

it('stores report cache separately without building search cache on laporan load', function () {
    $path = storage_path('app/testing-pemilih-separated-cache.xls');
    file_put_contents($path, <<<'HTML'
<html><body><table>
<tr><th>Bil.</th><th>Kod DM</th><th>Nama DM</th><th>Kod Lokaliti</th><th>Nama Lokaliti</th><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Tel. Bimbit</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th></tr>
<tr><td>1</td><td>="01"</td><td>PADANG CHICHAK</td><td>="001"</td><td>KG BARU KURA</td><td>="900101025555"</td><td>ALI BIN ABU</td><td>="0123456789"</td><td>L</td><td>M</td><td>2</td></tr>
</table></body></html>
HTML);

    $service = app(PemilihReportService::class);
    $report = $service->buildFromPath($path);
    $signature = sha1(implode('|', [
        $path,
        (string) filemtime($path),
        (string) filesize($path),
    ]));
    $reportCachePath = storage_path('app/report-cache/' . $signature . '-report.json');
    $searchCachePath = storage_path('app/report-cache/' . $signature . '-search.json');

    expect($report['summary']['total_voters'])->toBe(1)
        ->and(file_exists($reportCachePath))->toBeTrue()
        ->and(file_exists($searchCachePath))->toBeFalse();
});

it('builds search cache only when voter search is used', function () {
    $path = storage_path('app/testing-pemilih-search-cache.xls');
    file_put_contents($path, <<<'HTML'
<html><body><table>
<tr><th>Bil.</th><th>Kod DM</th><th>Nama DM</th><th>Kod Lokaliti</th><th>Nama Lokaliti</th><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Tel. Bimbit</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th></tr>
<tr><td>1</td><td>="01"</td><td>PADANG CHICHAK</td><td>="001"</td><td>KG BARU KURA</td><td>="900101025555"</td><td>ALI BIN ABU</td><td>="0123456789"</td><td>L</td><td>M</td><td>2</td></tr>
</table></body></html>
HTML);

    $service = app(PemilihReportService::class);
    $service->buildFromPath($path);
    $signature = sha1(implode('|', [
        $path,
        (string) filemtime($path),
        (string) filesize($path),
    ]));
    $searchCachePath = storage_path('app/report-cache/' . $signature . '-search.json');

    expect(file_exists($searchCachePath))->toBeFalse();

    $results = $service->searchVoters('ali', $path);

    expect($results)->toHaveCount(1)
        ->and($results[0]['name'])->toBe('ALI BIN ABU')
        ->and(file_exists($searchCachePath))->toBeTrue();
});
