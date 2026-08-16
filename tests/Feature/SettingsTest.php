<?php

use App\Models\CopiedRecord;
use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Models\SpokasMember;
use App\Models\SpokasMigrationResult;
use App\Models\SpokasMigrationRun;
use App\Models\User;
use App\Services\GoogleSheetService;
use Illuminate\Http\UploadedFile;

it('stores google sheet url in settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put('/settings', [
            'google_sheet_url' => 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0',
        ])
        ->assertRedirect();

    expect(Setting::valueOf('google_sheet_url'))
        ->toBe('https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');
});

it('stores n8n webhook settings', function () {
    $user = User::factory()->withModules(['settings'])->create();

    $this->actingAs($user)
        ->put('/settings', [
            'google_sheet_url' => 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0',
            'n8n_webhook_test_url' => 'https://example.test/webhook-test',
            'n8n_webhook_production_url' => 'https://example.test/webhook',
            'n8n_webhook_environment' => 'test',
        ])
        ->assertRedirect();

    expect(Setting::valueOf('n8n_webhook_test_url'))->toBe('https://example.test/webhook-test')
        ->and(Setting::valueOf('n8n_webhook_production_url'))->toBe('https://example.test/webhook')
        ->and(Setting::valueOf('n8n_webhook_environment'))->toBe('test');
});

it('renders settings page with pemilih upload metadata', function () {
    $user = User::factory()->withModules(['settings'])->create();
    $path = storage_path('app/settings-current-pemilih.xls');
    file_put_contents($path, '<html><body><table></table></body></html>');
    Setting::setValue('pemilih_report_file_path', $path);

    $this->actingAs($user)
        ->get(route('settings.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Settings/Edit')
            ->where('settings.pemilih_report.exists', true)
            ->where('settings.pemilih_report.name', 'settings-current-pemilih.xls')
            ->where('settings.n8n_webhook.environment', 'production'));
});

it('stores uploaded pemilih file from settings and syncs latest voter data', function () {
    $user = User::factory()->withModules(['settings'])->create();

    $firstPath = storage_path('app/settings-upload-sync-first.xls');
    file_put_contents($firstPath, <<<'HTML'
<html><body><table>
<tr><th>Bil.</th><th>Kod DM</th><th>Nama DM</th><th>Kod Lokaliti</th><th>Nama Lokaliti</th><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th><th>Alamat Kediaman</th><th>Tel. Rumah</th><th>Tel. Bimbit</th></tr>
<tr><td>1</td><td>="01"</td><td>PADANG CHICHAK</td><td>="001"</td><td>KG BARU KURA</td><td>="900101025555"</td><td>ALI LAMA</td><td>L</td><td>M</td><td>2</td><td>ALAMAT LAMA</td><td>="049999999"</td><td>="0123456789"</td></tr>
<tr><td>2</td><td>="02"</td><td>KAMPUNG BETONG</td><td>="002"</td><td>KG BETONG</td><td>="880808025333"</td><td>SITI AKTIF</td><td>P</td><td>M</td><td>3P</td><td>KG BETONG</td><td>="047777777"</td><td>="0198888777"</td></tr>
</table></body></html>
HTML);

    $secondPath = storage_path('app/settings-upload-sync-second.xls');
    file_put_contents($secondPath, <<<'HTML'
<html><body><table>
<tr><th>Bil.</th><th>Kod DM</th><th>Nama DM</th><th>Kod Lokaliti</th><th>Nama Lokaliti</th><th>No. K/P (Baru)</th><th>Nama Pemilih</th><th>Jantina</th><th>Bangsa</th><th>Kod Cula</th><th>Alamat Kediaman</th><th>Tel. Rumah</th><th>Tel. Bimbit</th></tr>
<tr><td>1</td><td>="01"</td><td>PADANG CHICHAK BARU</td><td>="009"</td><td>KG BARU UPDATE</td><td>="900101025555"</td><td>ALI BARU</td><td>L</td><td>M</td><td>10</td><td>ALAMAT BARU</td><td>="041111111"</td><td>="0112222333"</td></tr>
<tr><td>2</td><td>="03"</td><td>KAMPUNG BARU</td><td>="010"</td><td>KG TAMBAHAN</td><td>="770707015555"</td><td>ABU TAMBAH</td><td>L</td><td>M</td><td>2</td><td>KG TAMBAHAN</td><td>="046666666"</td><td>="0133333444"</td></tr>
</table></body></html>
HTML);

    $this->actingAs($user)
        ->post(route('settings.pemilih-upload'), [
            'pemilih_file' => new UploadedFile($firstPath, 'pemilih-first.xls', 'application/vnd.ms-excel', null, true),
        ])
        ->assertRedirect(route('settings.edit'));

    $this->actingAs($user)
        ->post(route('settings.pemilih-upload'), [
            'pemilih_file' => new UploadedFile($secondPath, 'pemilih-second.xls', 'application/vnd.ms-excel', null, true),
        ])
        ->assertRedirect(route('settings.edit'));

    $storedPath = Setting::valueOf('pemilih_report_file_path');

    expect($storedPath)->not->toBeNull()
        ->and(file_exists($storedPath))->toBeTrue();

    $this->assertDatabaseHas('pemilih_records', [
        'identity_number' => '900101025555',
        'name' => 'ALI BARU',
        'dm' => 'PADANG CHICHAK BARU',
        'locality' => 'KG BARU UPDATE',
        'status' => 'aktif',
    ]);

    $this->assertDatabaseHas('pemilih_records', [
        'identity_number' => '770707015555',
        'name' => 'ABU TAMBAH',
        'status' => 'aktif',
    ]);

    $this->assertDatabaseHas('pemilih_records', [
        'identity_number' => '880808025333',
        'name' => 'SITI AKTIF',
        'status' => 'xaktif',
    ]);

    expect(PemilihRecord::query()->count())->toBe(3);
});

it('retries spokas records not found after a new pemilih file is uploaded', function () {
    $admin = User::factory()->masterAdmin()->create();
    $settingsUser = User::factory()->withModules(['settings'])->create();

    SpokasMember::query()->create([
        'name' => 'AHLI BAHARU',
        'member_number' => 'SPOKAS-001',
        'ic_birth' => '900101011234',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.spokas.migrate'))
        ->assertRedirect(route('admin.spokas.index'));

    $result = SpokasMigrationResult::query()->firstOrFail();
    expect($result->category)->toBe('not_found');

    $path = storage_path('app/settings-upload-spokas-retry.xls');
    file_put_contents($path, <<<'HTML'
<html><body><table>
<tr><th>No. K/P (Baru)</th><th>Nama Pemilih</th></tr>
<tr><td>="900101011234"</td><td>AHLI BAHARU</td></tr>
</table></body></html>
HTML);

    $this->actingAs($settingsUser)
        ->post(route('settings.pemilih-upload'), [
            'pemilih_file' => new UploadedFile($path, 'pemilih-spokas-retry.xls', 'application/vnd.ms-excel', null, true),
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHas('success', fn (string $message): bool => str_contains($message, '1 rekod SPOKAS'));

    $result->refresh();
    $run = SpokasMigrationRun::query()->latest('id')->firstOrFail();

    expect($result->category)->toBe('ic')
        ->and($result->pemilih_id)->not->toBeNull()
        ->and($run->ic_match_count)->toBe(1)
        ->and($run->failed_count)->toBe(0)
        ->and($run->updated_count)->toBe(1);

    $this->assertDatabaseHas('pemilih_records', [
        'identity_number' => '900101011234',
        'no_ahli' => 'SPOKAS-001',
        'name' => 'AHLI BAHARU',
    ]);
});

it('records copied rows for the active sheet', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    $this->actingAs($user)
        ->postJson('/copied-records', [
            'row_key' => 'row-123',
            'no_kp' => '900101015555',
        ])
        ->assertOk()
        ->assertJson([
            'message' => 'Status salinan berjaya direkodkan.',
        ]);

    $record = CopiedRecord::query()->first();

    expect($record)->not->toBeNull();
    expect($record->sheet_key)
        ->toBe(md5('https://docs.google.com/spreadsheets/d/abc123/edit?gid=0'));
    expect($record->no_kp)
        ->toBe('900101015555');
});

it('converts google sheet links into csv export url', function () {
    $service = app(GoogleSheetService::class);

    expect($service->toCsvExportUrl('https://docs.google.com/spreadsheets/d/1AF1_jmW0e9kybpBbT6y4I6yHpAvScwSGj-Qb_ZEPsUU/edit?gid=123'))
        ->toBe('https://docs.google.com/spreadsheets/d/1AF1_jmW0e9kybpBbT6y4I6yHpAvScwSGj-Qb_ZEPsUU/export?format=csv&gid=123');
});
