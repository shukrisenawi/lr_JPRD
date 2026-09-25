<?php

use App\Models\Aktiviti;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('renders the activity page for an authorized user', function () {
    $user = User::factory()->withModules(['dashboard', 'aktiviti'])->create();

    $this->actingAs($user)
        ->get(route('aktiviti.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Aktiviti/Index')
            ->where('upcomingActivities', [])
            ->where('pastActivities', [])
            ->where('hasPublicPassword', false)
            ->where('passwordEnabled', false)
            ->where('publicLink', fn ($link) => is_string($link) && str_contains($link, '/aktiviti/awam/')));
});

it('allows an authorized user to create, update, and delete an activity', function () {
    $user = User::factory()->withModules(['dashboard', 'aktiviti'])->create();

    $this->actingAs($user)
        ->post(route('aktiviti.store'), [
            'tajuk' => 'Taklimat Kad 1:10',
            'kategori' => 'Taklimat',
            'peringkat' => ['JPRD', 'UDM'],
            'tarikh' => '2099-05-09',
            'masa' => '20:30',
            'tempat' => 'Dewan JPRD',
            'catatan' => 'Bawa dokumen berkaitan.',
        ])
        ->assertRedirect(route('aktiviti.index'));

    $aktiviti = Aktiviti::query()->sole();

    expect($aktiviti->tajuk)->toBe('Taklimat Kad 1:10')
        ->and($aktiviti->kategori)->toBe('Taklimat')
        ->and($aktiviti->peringkat)->toBe(['JPRD', 'UDM'])
        ->and($aktiviti->tarikh?->format('Y-m-d'))->toBe('2099-05-09')
        ->and(substr((string) $aktiviti->masa, 0, 5))->toBe('20:30')
        ->and($aktiviti->user_id)->toBe($user->id);

    $this->actingAs($user)
        ->put(route('aktiviti.update', $aktiviti), [
            'tajuk' => 'Taklimat Kad 1:10 Dikemas Kini',
            'kategori' => 'Mesyuarat',
            'peringkat' => ['CAWANGAN'],
            'tarikh' => '2099-05-10',
            'masa' => '09:00',
            'tempat' => 'Bilik Mesyuarat',
            'catatan' => '',
        ])
        ->assertRedirect(route('aktiviti.index'));

    expect($aktiviti->fresh()->tajuk)->toBe('Taklimat Kad 1:10 Dikemas Kini')
        ->and($aktiviti->fresh()->peringkat)->toBe(['CAWANGAN'])
        ->and($aktiviti->fresh()->tarikh?->format('Y-m-d'))->toBe('2099-05-10')
        ->and(substr((string) $aktiviti->fresh()->masa, 0, 5))->toBe('09:00');

    $this->actingAs($user)
        ->delete(route('aktiviti.destroy', $aktiviti))
        ->assertRedirect(route('aktiviti.index'));

    $this->assertDatabaseMissing('aktiviti', ['id' => $aktiviti->id]);
});

it('requires the activity module before opening the activity page', function () {
    $user = User::factory()->withModules(['dashboard'])->create();

    $this->actingAs($user)
        ->get(route('aktiviti.index'))
        ->assertRedirect(route('profile.edit', absolute: false));
});

it('protects the public activity link with one shared password and hides past activities', function () {
    Setting::setValue('aktiviti_public_token', 'test-public-token');
    Setting::setValue('aktiviti_public_password_hash', Hash::make('rahsia123'));

    Aktiviti::query()->create([
        'tajuk' => 'Mesyuarat JPRD Akan Datang',
        'kategori' => 'Mesyuarat',
        'peringkat' => ['JPRD', 'UDM'],
        'tarikh' => '2099-01-10',
        'masa' => '10:00',
        'tempat' => 'Bilik Mesyuarat',
    ]);
    Aktiviti::query()->create([
        'tajuk' => 'Mesyuarat JPRD Yang Lepas',
        'tarikh' => '2020-01-10',
        'masa' => '10:00',
    ]);

    $publicRoute = route('aktiviti.public', 'test-public-token');

    $this->get($publicRoute)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Aktiviti/Public')
            ->where('hasAccess', false)
            ->where('passwordConfigured', true)
            ->where('activities', []));

    $this->from($publicRoute)
        ->post(route('aktiviti.public.access', 'test-public-token'), ['password' => 'salah'])
        ->assertRedirect($publicRoute)
        ->assertSessionHasErrors('password');

    $this->post(route('aktiviti.public.access', 'test-public-token'), ['password' => 'rahsia123'])
        ->assertRedirect($publicRoute);

    $this->get($publicRoute)
        ->assertInertia(fn ($page) => $page
            ->where('hasAccess', true)
            ->where('activities', fn ($activities) => collect($activities)->pluck('tajuk')->values()->all() === ['Mesyuarat JPRD Akan Datang']));
});

it('rejects an unknown public activity token', function () {
    $this->get(route('aktiviti.public', 'token-tidak-wujud'))
        ->assertNotFound();
});

it('stores the public password as a hash', function () {
    $user = User::factory()->withModules(['dashboard', 'aktiviti'])->create();

    $this->actingAs($user)
        ->put(route('aktiviti.public-password.update'), [
            'password' => 'password-baharu',
            'password_confirmation' => 'password-baharu',
        ])
        ->assertRedirect();

    $stored = Setting::valueOf('aktiviti_public_password_hash');

    expect($stored)->not->toBe('password-baharu')
        ->and(Hash::check('password-baharu', $stored))->toBeTrue()
        ->and(Setting::valueOf('aktiviti_public_password_enabled'))->toBe('1');
});

it('allows an authorized user to turn public password protection off and on', function () {
    $user = User::factory()->withModules(['dashboard', 'aktiviti'])->create();
    Setting::setValue('aktiviti_public_token', 'toggle-token');
    Setting::setValue('aktiviti_public_password_hash', Hash::make('rahsia123'));
    Aktiviti::query()->create([
        'tajuk' => 'Aktiviti Tanpa Gate',
        'peringkat' => ['JPRD'],
        'tarikh' => '2099-01-10',
        'masa' => '10:00',
    ]);

    $publicRoute = route('aktiviti.public', 'toggle-token');

    $this->actingAs($user)
        ->put(route('aktiviti.public-password.status.update'), ['enabled' => false])
        ->assertRedirect();

    expect(Setting::valueOf('aktiviti_public_password_enabled'))->toBe('0');

    $this->get($publicRoute)
        ->assertInertia(fn ($page) => $page
            ->where('hasAccess', true)
            ->where('passwordEnabled', false)
            ->where('activities.0.tajuk', 'Aktiviti Tanpa Gate'));

    $this->actingAs($user)
        ->put(route('aktiviti.public-password.status.update'), ['enabled' => true])
        ->assertRedirect();

    $this->get($publicRoute)
        ->assertInertia(fn ($page) => $page
            ->where('hasAccess', false)
            ->where('passwordEnabled', true)
            ->where('activities', []));
});

it('requires at least one activity level', function () {
    $user = User::factory()->withModules(['dashboard', 'aktiviti'])->create();

    $this->actingAs($user)
        ->post(route('aktiviti.store'), [
            'tajuk' => 'Aktiviti Tanpa Peringkat',
            'tarikh' => '2099-01-10',
            'masa' => '10:00',
            'peringkat' => [],
        ])
        ->assertSessionHasErrors('peringkat');
});
