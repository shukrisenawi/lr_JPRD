<?php

use App\Models\CopiedRecord;
use App\Models\Setting;
use App\Models\User;
use App\Services\GoogleSheetService;

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
