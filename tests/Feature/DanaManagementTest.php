<?php

use App\Models\Cawangan;
use App\Models\Dana;
use App\Models\DanaKategori;
use App\Models\PemilihRecord;
use App\Models\User;

function danaVoter(string $udm): PemilihRecord
{
    return PemilihRecord::query()->create([
        'identity_number' => fake()->unique()->numerify('DANA############'),
        'no_kp' => fake()->unique()->numerify('############'),
        'name' => 'PEMILIH DANA',
        'dm' => $udm,
        'status' => 'aktif',
    ]);
}

function danaCategory(): DanaKategori
{
    return DanaKategori::query()->where('is_other', false)->firstOrCreate([
        'name' => 'Sumbangan',
    ]);
}

it('renders UDM cards with incoming, outgoing, and balance totals', function () {
    $user = User::factory()->withModules(['dashboard', 'dana'])->create();
    danaVoter('UDM ALPHA');
    danaVoter('UDM BETA');
    $category = danaCategory();

    Dana::query()->create([
        'udm' => 'UDM ALPHA',
        'kategori_id' => $category->id,
        'jenis' => 'masuk',
        'jumlah' => 500,
        'tarikh' => '2026-09-01',
        'keterangan' => 'Sumbangan awal',
    ]);
    Dana::query()->create([
        'udm' => 'UDM ALPHA',
        'kategori_id' => $category->id,
        'jenis' => 'keluar',
        'jumlah' => 125.50,
        'tarikh' => '2026-09-02',
        'keterangan' => 'Belanja program',
    ]);

    $this->actingAs($user)
        ->get(route('dana.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dana/Index')
            ->where('udms', ['UDM ALPHA', 'UDM BETA'])
            ->where('selectedUdm', '')
            ->where('canSelectAll', true)
            ->where('udmSummaries.0.udm', 'UDM ALPHA')
            ->where('udmSummaries.0.count', 2)
            ->where('udmSummaries.0.total_masuk', '500.00')
            ->where('udmSummaries.0.total_keluar', '125.50')
            ->where('udmSummaries.0.baki', '374.50')
            ->where('udmSummaries.1.baki', '0.00')
            ->where('canManageCategories', false));
});

it('shows selected UDM transactions and allows dana CRUD', function () {
    $user = User::factory()->withModules(['dashboard', 'dana'])->create();
    danaVoter('UDM ALPHA');
    $category = danaCategory();

    $this->actingAs($user)
        ->post(route('dana.store'), [
            '_redirect_udm' => 'UDM ALPHA',
            'udm' => 'UDM ALPHA',
            'kategori_id' => $category->id,
            'jenis' => 'masuk',
            'jumlah' => '300.50',
            'tarikh' => '2026-09-10',
            'keterangan' => 'Dana program',
            'catatan' => 'Catatan asal',
        ])
        ->assertRedirect(route('dana.index', ['udm' => 'UDM ALPHA']));

    $dana = Dana::query()->sole();
    expect($dana->jumlah)->toBe('300.50')
        ->and($dana->created_by)->toBe($user->id);

    $this->actingAs($user)
        ->get(route('dana.index', ['udm' => 'UDM ALPHA']))
        ->assertInertia(fn ($page) => $page
            ->where('selectedUdm', 'UDM ALPHA')
            ->where('dana.0.keterangan', 'Dana program')
            ->where('dana.0.jumlah', '300.50'));

    $this->actingAs($user)
        ->put(route('dana.update', $dana), [
            '_redirect_udm' => 'UDM ALPHA',
            'udm' => 'UDM ALPHA',
            'kategori_id' => $category->id,
            'jenis' => 'keluar',
            'jumlah' => '75.25',
            'tarikh' => '2026-09-11',
            'keterangan' => 'Belanja program',
        ])
        ->assertRedirect(route('dana.index', ['udm' => 'UDM ALPHA']));

    expect($dana->fresh()->jenis)->toBe('keluar')
        ->and($dana->fresh()->jumlah)->toBe('75.25')
        ->and($dana->fresh()->keterangan)->toBe('Belanja program');

    $this->actingAs($user)
        ->delete(route('dana.destroy', $dana), ['_redirect_udm' => 'UDM ALPHA'])
        ->assertRedirect(route('dana.index', ['udm' => 'UDM ALPHA']));

    $this->assertDatabaseMissing('dana', ['id' => $dana->id]);
});

it('requires a custom fund type for the Lain-lain category', function () {
    $user = User::factory()->withModules(['dashboard', 'dana'])->create();
    danaVoter('UDM ALPHA');
    $other = DanaKategori::query()->where('is_other', true)->firstOrFail();

    $this->actingAs($user)
        ->post(route('dana.store'), [
            'udm' => 'UDM ALPHA',
            'kategori_id' => $other->id,
            'jenis' => 'masuk',
            'jumlah' => '80',
            'tarikh' => '2026-09-12',
            'keterangan' => 'Dana lain',
        ])
        ->assertSessionHasErrors('jenis_dana_lain');

    $this->actingAs($user)
        ->post(route('dana.store'), [
            'udm' => 'UDM ALPHA',
            'kategori_id' => $other->id,
            'jenis_dana_lain' => 'Jualan amal',
            'jenis' => 'masuk',
            'jumlah' => '80',
            'tarikh' => '2026-09-12',
            'keterangan' => 'Dana lain',
        ])
        ->assertRedirect(route('dana.index'));

    $this->assertDatabaseHas('dana', [
        'kategori_id' => $other->id,
        'jenis_dana_lain' => 'Jualan amal',
    ]);
});

it('allows category access users to add and edit categories but protects used categories', function () {
    $admin = User::factory()->withModules(['dashboard', 'dana', 'dana.kategori'])->create();

    $this->actingAs($admin)
        ->get(route('dana.index'))
        ->assertInertia(fn ($page) => $page->where('canManageCategories', true));

    $this->actingAs($admin)
        ->post(route('dana.kategori.store'), ['name' => 'Peruntukan'])
        ->assertRedirect();

    $category = DanaKategori::query()->where('name', 'Peruntukan')->firstOrFail();

    $this->actingAs($admin)
        ->put(route('dana.kategori.update', $category), ['name' => 'Peruntukan Bulanan'])
        ->assertRedirect();

    expect($category->fresh()->name)->toBe('Peruntukan Bulanan');

    danaVoter('UDM ALPHA');
    Dana::query()->create([
        'udm' => 'UDM ALPHA',
        'kategori_id' => $category->id,
        'jenis' => 'masuk',
        'jumlah' => 10,
        'tarikh' => '2026-09-13',
        'keterangan' => 'Digunakan',
    ]);

    $this->actingAs($admin)
        ->delete(route('dana.kategori.destroy', $category))
        ->assertSessionHas('error');

    $this->assertDatabaseHas('dana_kategori', ['id' => $category->id]);
});

it('limits dana records to the users UDM scope', function () {
    danaVoter('UDM ALPHA');
    danaVoter('UDM BETA');
    $category = danaCategory();
    $betaDana = Dana::query()->create([
        'udm' => 'UDM BETA',
        'kategori_id' => $category->id,
        'jenis' => 'masuk',
        'jumlah' => 100,
        'tarikh' => '2026-09-14',
        'keterangan' => 'Dana Beta',
    ]);
    $user = User::factory()->withModules(['dashboard', 'dana'])->create([
        'access_level' => 'udm',
        'scope_key' => 'UDM ALPHA',
    ]);

    $this->actingAs($user)
        ->get(route('dana.index', ['udm' => 'UDM BETA']))
        ->assertInertia(fn ($page) => $page
            ->where('udms', ['UDM ALPHA'])
            ->where('selectedUdm', 'UDM ALPHA')
            ->where('dana', []));

    $this->actingAs($user)
        ->post(route('dana.store'), [
            'udm' => 'UDM BETA',
            'kategori_id' => $category->id,
            'jenis' => 'masuk',
            'jumlah' => 10,
            'tarikh' => '2026-09-15',
            'keterangan' => 'Tidak dibenarkan',
        ])
        ->assertSessionHasErrors('udm');

    $this->actingAs($user)
        ->deleteJson(route('dana.destroy', $betaDana))
        ->assertForbidden();
});

it('includes the parent UDM for cawangan users', function () {
    danaVoter('UDM ALPHA');
    danaVoter('UDM BETA');
    $cawangan = Cawangan::query()->create(['name' => 'Cawangan Alpha', 'udm' => 'UDM ALPHA']);
    $user = User::factory()->withModules(['dashboard', 'dana'])->create([
        'access_level' => 'cawangan',
        'scope_key' => (string) $cawangan->id,
    ]);

    $this->actingAs($user)
        ->get(route('dana.index'))
        ->assertInertia(fn ($page) => $page
            ->where('udms', ['UDM ALPHA'])
            ->where('selectedUdm', 'UDM ALPHA')
            ->where('canSelectAll', false));
});
