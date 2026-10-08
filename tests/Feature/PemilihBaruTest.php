<?php

use App\Models\PemilihBaruRecord;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Inertia\Testing\AssertableInertia as Assert;

it('imports pemilih baharu into its own monthly table and transfers cula when the current file is imported', function () {
    $user = User::factory()->withModules(['settings', 'culaan.senarai'])->create();

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
<tr><th>No KP</th><th>ID Lain</th><th>Nama</th><th>Nama DM</th><th>Nama Lokaliti</th><th>Jantina</th><th>Transaksi</th><th>Kod Cula</th></tr>
<tr><td>90010102****</td><td></td><td>ALI PEMILIH BAHARU</td><td>PADANG CHICHAK</td><td>KG BARU</td><td>L</td><td>PENDAFTARAN BARU</td><td></td></tr>
</table></body></html>
HTML;

    $this->actingAs($user)
        ->post(route('settings.pemilih-baru-upload'), [
            'pemilih_baru_file' => UploadedFile::fake()->createWithContent('pemilih-baru.xls', $newVoterSheet),
            'bulan' => '9',
            'tahun' => '2026',
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHas('success');

    $record = PemilihBaruRecord::query()->sole();
    expect($record->import_month)->toBe('2026-09')
        ->and($record->no_kp)->toBe('90010102****')
        ->and($record->cula_code)->toBeNull()
        ->and($record->remark)->toBe('Belum link');

    $this->actingAs($user)
        ->post(route('pemilih-baru.cula.update', $record), ['cula_code' => '2'])
        ->assertRedirect(route('pemilih-baru.index', ['bulan' => '09', 'tahun' => '2026']));

    expect($record->fresh()->cula_code)->toBe('2');
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
        ->assertSessionHas('success', fn (string $message): bool => str_contains($message, '1 rekod pemilih baharu'));

    expect($record->fresh()->remark)->toBe('Dah link')
        ->and($record->fresh()->linked_pemilih_record_id)->toBe(PemilihRecord::query()->firstOrFail()->id);

    $this->assertDatabaseHas('pemilih_records', [
        'identity_number' => '900101021234',
        'cula_code' => '2',
        'cula_display_label' => 'PAS',
    ]);

    File::delete(storage_path('app/reports/pemilih-latest.xls'));
});

it('shows pemilih baharu cula menu using the previous month by default', function () {
    $user = User::factory()->withModules(['culaan.senarai'])->create();
    Carbon\Carbon::setTestNow('2026-10-08 12:00:00');

    $this->actingAs($user)
        ->get(route('pemilih-baru.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('PemilihBaru/Index')
            ->where('filters.bulan', '09')
            ->where('filters.tahun', '2026')
            ->where('summary.total', 0)
            ->where('filters.udm', '')
            ->where('records.data', []));

    Carbon\Carbon::setTestNow();
});

it('requires UDM selection before showing new voter records and shows the pending menu badge', function () {
    $user = User::factory()->withModules(['culaan.senarai'])->create();
    Carbon\Carbon::setTestNow('2026-10-08 12:00:00');

    PemilihBaruRecord::query()->create([
        'record_key' => sha1('alpha-pending'),
        'import_month' => '2026-09',
        'name' => 'ALI BELUM CULA',
        'dm' => 'UDM ALPHA',
        'locality' => 'LOKALITI A',
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
            ->where('records.data', [])
            ->where('udm_summaries.0.name', 'UDM ALPHA')
            ->where('udm_summaries.0.total', 2)
            ->where('udm_summaries.0.completed', 1)
            ->where('badgeCounts.culaPemilihBaruBelumCula', 2));

    $this->actingAs($user)
        ->get(route('pemilih-baru.index', ['udm' => 'UDM ALPHA']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.udm', 'UDM ALPHA')
            ->where('summary.total', 2)
            ->where('records.data.0.name', 'ALI BELUM CULA'));

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
