<?php

use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Support\Str;

function createTambahPemilihRecord(array $attributes = []): PemilihRecord
{
    return PemilihRecord::create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'name' => 'Pemilih Manual',
        'status' => 'aktif',
        'is_manual' => true,
    ], $attributes));
}

it('searches manual voters and keeps search parameters in pagination links', function () {
    $user = User::factory()->withModules(['tambah-pemilih'])->create();

    createTambahPemilihRecord([
        'name' => 'AHMAD MANUAL',
        'no_kp' => '900101025555',
        'dm' => 'UDM A',
    ]);
    createTambahPemilihRecord([
        'name' => 'BINTI LAIN',
        'no_kp' => '880202026666',
    ]);
    PemilihRecord::create([
        'identity_number' => '810819025199',
        'name' => 'KHALIL BASYA BIN MOHAMMAD',
        'no_kp' => '810819025199',
        'status' => 'xaktif',
        'is_manual' => false,
    ]);

    $this->actingAs($user)
        ->get('/tambah-pemilih?tab=senarai&search=AHMAD')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('TambahPemilih/Index')
            ->where('manual_search', 'AHMAD')
            ->where('manualVoters.total', 1)
            ->where('manualVoters.data.0.name', 'AHMAD MANUAL'));

    $this->actingAs($user)
        ->get('/tambah-pemilih?tab=senarai&search=810819025199')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('manualVoters.total', 1)
            ->where('manualVoters.data.0.name', 'KHALIL BASYA BIN MOHAMMAD')
            ->where('manualVoters.data.0.is_manual', false)
            ->where('manualVoters.data.0.status', 'xaktif'));

    $this->actingAs($user)
        ->post('/tambah-pemilih', [
            'name' => 'CUBA DUPLIKAT',
            'no_kp' => '810819025199',
        ])
        ->assertSessionHasErrors('no_kp');

    foreach (range(1, 21) as $index) {
        createTambahPemilihRecord([
            'name' => "PAGINASI {$index}",
        ]);
    }

    $this->actingAs($user)
        ->get('/tambah-pemilih?tab=senarai&search=PAGINASI&page=2')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('manualVoters.current_page', 2)
            ->where('manualVoters.total', 21)
            ->where('manualVoters.links', function ($links) {
                return collect($links)
                    ->filter(fn ($link) => $link['url'] !== null)
                    ->every(fn ($link) => str_contains($link['url'], 'tab=senarai') && str_contains($link['url'], 'search=PAGINASI'));
            }));
});
