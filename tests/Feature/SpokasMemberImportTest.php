<?php

use App\Models\SpokasMember;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('replaces existing spokas member rows before a fresh import', function () {
    $path = tempnam(sys_get_temp_dir(), 'spokas-');

    file_put_contents($path, json_encode([
        'meta' => [
            'source_key' => 'spokas_test',
            'captured_at' => '2026-08-10T12:00:00+00:00',
        ],
        'rows' => [
            [
                'page_number' => 1,
                'page_position' => 1,
                'record_id' => '100',
                'name' => 'AHLI PERTAMA',
                'member_no' => '000001',
                'nric_birth' => '800101010101',
                'nric_old' => null,
                'status' => 'AKTIF',
                'source_url' => 'https://spokas.pas.net.my/agung/infoahli01b.asp?txtRecID=100',
            ],
            [
                'page_number' => 1,
                'page_position' => 2,
                'record_id' => '101',
                'name' => 'AHLI KEDUA',
                'member_no' => '000002',
                'nric_birth' => '810202020202',
                'nric_old' => '1234567',
                'status' => 'MATI',
            ],
        ],
    ], JSON_THROW_ON_ERROR));

    $this->artisan('spokas:import', ['file' => $path, '--replace' => true])
        ->assertSuccessful();

    $this->artisan('spokas:import', ['file' => $path, '--replace' => true])
        ->assertSuccessful();

    expect(SpokasMember::query()->count())->toBe(2)
        ->and(SpokasMember::query()->where('member_number', '000001')->value('name'))
        ->toBe('AHLI PERTAMA');

    unlink($path);
});
