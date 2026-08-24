<?php

use App\Models\Setting;
use App\Models\User;
use App\Services\GoogleSheetService;
use Illuminate\Support\Facades\Http;

it('redirects guests from dashboard to login', function () {
    $this->get('/dashboard')
        ->assertRedirect('/login');
});

it('redirects authenticated users to their profile instead of looping on forbidden dashboard', function () {
    $user = User::factory()->withModules(['kad-ten'])->create();

    $this->actingAs($user)
        ->from(route('dashboard'))
        ->get(route('dashboard'))
        ->assertRedirect(route('profile.edit'));

    $this->assertAuthenticatedAs($user);
});

it('renders dashboard data for authenticated admin', function () {
    $user = User::factory()->create();

    $service = Mockery::mock(GoogleSheetService::class);
    $service->shouldReceive('fetchSheetData')
        ->once()
        ->andReturn([
            'headers' => ['no_kp', 'nama_pemilih'],
            'rows' => [
                [
                    'id' => 'row-1',
                    'position' => 1,
                    'copy_text' => '/kemascula 123',
                    'is_copied' => false,
                    'copied_at' => null,
                    'values' => [
                        'no_kp' => '123',
                        'nama_pemilih' => 'Ali',
                    ],
                ],
            ],
            'sheet_key' => 'abc',
            'sheet_url' => 'https://docs.google.com/spreadsheets/d/example/edit',
            'csv_url' => 'https://docs.google.com/spreadsheets/d/example/export?format=csv',
        ]);
    $service->shouldReceive('countPendingNewRows')
        ->once()
        ->andReturn(1);

    $this->app->instance(GoogleSheetService::class, $service);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('sheet.rows.0.copy_text', '/kemascula 123')
            ->where('sheet.rows.0.values.nama_pemilih', 'Ali'));
});

it('pads no kp with leading zeroes until 12 digits on dashboard data', function () {
    $user = User::factory()->create();

    Setting::setValue('google_sheet_url', 'https://docs.google.com/spreadsheets/d/abc123/edit?gid=0');

    Http::fake([
        '*' => Http::response(
            "no_kp,nama_pemilih\n123,Ali\n",
            200,
            ['Content-Type' => 'text/csv']
        ),
    ]);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('sheet.rows.0.copy_text', '/kemascula 000000000123')
            ->where('sheet.rows.0.values.no_kp', '000000000123')
            ->where('sheet.rows.0.values.nama_pemilih', 'Ali'));
});
