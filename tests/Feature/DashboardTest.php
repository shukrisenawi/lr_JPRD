<?php

use App\Models\User;
use App\Services\GoogleSheetService;

it('redirects guests from dashboard to login', function () {
    $this->get('/dashboard')
        ->assertRedirect('/login');
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

    $this->app->instance(GoogleSheetService::class, $service);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('sheet.rows.0.copy_text', '/kemascula 123')
            ->where('sheet.rows.0.values.nama_pemilih', 'Ali'));
});
