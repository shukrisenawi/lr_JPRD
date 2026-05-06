<?php

use App\Models\SheetPage;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Http;

it('creates the first page from unique sheet rows only', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fake([
        '*' => Http::response(
            "no_kp,nama_pemilih\n123,Ali\n123,Ali\n456,Abu\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
    ]);

    $this->actingAs($user)
        ->post('/sheet-pages')
        ->assertRedirect(route('dashboard'));

    $page = SheetPage::query()->with('rows')->first();

    expect($page)->not->toBeNull();
    expect($page->page_number)->toBe(1);
    expect($page->rows)->toHaveCount(2);
    expect($page->rows->pluck('no_kp')->all())
        ->toBe(['000000000123', '000000000456']);
});

it('creates the next page with new rows only', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fakeSequence()
        ->push(
            "no_kp,nama_pemilih\n123,Ali\n456,Abu\n",
            200,
            ['Content-Type' => 'text/csv']
        )
        ->push(
            "no_kp,nama_pemilih\n123,Ali\n456,Abu\n789,Siti\n",
            200,
            ['Content-Type' => 'text/csv']
        );

    $this->actingAs($user)->post('/sheet-pages');

    $this->actingAs($user)
        ->post('/sheet-pages')
        ->assertRedirect(route('dashboard'));

    $pages = SheetPage::query()
        ->with('rows')
        ->orderBy('page_number')
        ->get();

    expect($pages)->toHaveCount(2);
    expect($pages[1]->page_number)->toBe(2);
    expect($pages[1]->rows)->toHaveCount(1);
    expect($pages[1]->rows[0]->no_kp)->toBe('000000000789');
});

it('reimports the same rows after a page has been deleted', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fakeSequence()
        ->push(
            "no_kp,nama_pemilih\n123,Ali\n456,Abu\n",
            200,
            ['Content-Type' => 'text/csv']
        )
        ->push(
            "no_kp,nama_pemilih\n123,Ali\n456,Abu\n",
            200,
            ['Content-Type' => 'text/csv']
        );

    $this->actingAs($user)->post('/sheet-pages');

    $page = SheetPage::query()->firstOrFail();

    $this->actingAs($user)
        ->delete("/sheet-pages/{$page->id}")
        ->assertRedirect(route('dashboard'));

    $this->actingAs($user)
        ->post('/sheet-pages')
        ->assertRedirect(route('dashboard'));

    $pages = SheetPage::withTrashed()
        ->with('rows')
        ->orderBy('page_number')
        ->get();

    expect($pages)->toHaveCount(2);
    expect($pages[0]->deleted_at)->not->toBeNull();
    expect($pages[1]->page_number)->toBe(2);
    expect($pages[1]->rows)->toHaveCount(2);
    expect($pages[1]->rows->pluck('no_kp')->all())
        ->toBe(['000000000123', '000000000456']);
});

it('shows active pages and pending new unique rows on dashboard', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fakeSequence()
        ->push(
            "no_kp,nama_pemilih\n123,Ali\n456,Abu\n",
            200,
            ['Content-Type' => 'text/csv']
        )
        ->push(
            "no_kp,nama_pemilih\n123,Ali\n456,Abu\n789,Siti\n",
            200,
            ['Content-Type' => 'text/csv']
        );

    $this->actingAs($user)->post('/sheet-pages');

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('pages.0.page_number', 1)
            ->where('pages.0.rows.0.values.nama_pemilih', 'Ali')
            ->where('sheet.new_rows_available', 1));
});

it('returns no changes for silent auto sync requests when on off tab is not zero', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fake([
        'https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0' => Http::response(
            "no_kp,nama_pemilih\n123,Ali\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
        'https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&sheet=ON%2FOFF' => Http::response(
            "1\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
    ]);

    $this->actingAs($user)
        ->postJson('/sheet-pages', [
            'silent' => true,
        ])
        ->assertOk()
        ->assertJson([
            'status' => 'no_changes',
        ]);
});

it('auto sync only creates page for rows with on off value zero', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fake([
        'https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0' => Http::response(
            "no_kp,nama_pemilih\n123,Ali\n456,Abu\n789,Siti\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
        'https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&sheet=ON%2FOFF' => Http::response(
            "0\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
    ]);

    $this->actingAs($user)
        ->postJson('/sheet-pages', [
            'silent' => true,
        ])
        ->assertOk()
        ->assertJson([
            'status' => 'created',
            'page_number' => 1,
        ]);

    $page = SheetPage::query()->with('rows')->first();

    expect($page)->not->toBeNull();
    expect($page->rows)->toHaveCount(3);
    expect($page->rows->pluck('no_kp')->all())
        ->toBe(['000000000123', '000000000456', '000000000789']);
});

it('auto sync ignores status text in on off tab and reads numeric value', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fake([
        'https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0' => Http::response(
            "no_kp,nama_pemilih\n123,Ali\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
        'https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&sheet=ON%2FOFF' => Http::response(
            "STATUS\n0\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
    ]);

    $this->actingAs($user)
        ->postJson('/sheet-pages', [
            'silent' => true,
        ])
        ->assertOk()
        ->assertJson([
            'status' => 'created',
            'page_number' => 1,
        ]);
});

it('manual sync still allows unique rows regardless of on off value', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fake([
        '*' => Http::response(
            "no_kp,nama_pemilih\n123,Ali\n456,Abu\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
    ]);

    $this->actingAs($user)
        ->post('/sheet-pages')
        ->assertRedirect(route('dashboard'));

    $page = SheetPage::query()->with('rows')->first();

    expect($page)->not->toBeNull();
    expect($page->rows)->toHaveCount(2);
});
