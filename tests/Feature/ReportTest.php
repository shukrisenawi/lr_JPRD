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
        ->and($report['by_dm'][0]['name'])->toBe('KAMPUNG BETONG')
        ->and($report['by_dm'][0]['total'])->toBe(2)
        ->and($report['cula_by_dm'][0]['name'])->toBe('KAMPUNG BETONG')
        ->and($report['cula_by_dm'][0]['cula_breakdown'][0]['code'])->toBe('2')
        ->and($report['cula_by_dm'][0]['cula_breakdown'][0]['total'])->toBe(1)
        ->and($report['dm_details'][0]['name'])->toBe('KAMPUNG BETONG')
        ->and($report['dm_details'][0]['summary']['total_localities'])->toBe(2)
        ->and($report['dm_details'][0]['race_breakdown'][0]['code'])->toBe('I')
        ->and($report['dm_details'][0]['localities'][0]['cula_breakdown'][0]['code'])->toBe('2')
        ->and($report['by_cula'][0]['code'])->toBe('2')
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
            ->where('report.by_dm.0.name', 'KAMPUNG BETONG')
            ->where('report.cula_by_dm.0.cula_breakdown.0.code', '2')
            ->where('report.dm_details.0.summary.total_localities', 2));
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
