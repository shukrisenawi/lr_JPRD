<?php

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('records first views per recipient and exposes names only to master admin', function () {
    $admin = User::factory()->masterAdmin()->create();
    $user = User::factory()->withModules(['dashboard'])->create();
    $other = User::factory()->withModules(['dashboard'])->create();
    $item = Announcement::create(['title' => 'Dilihat', 'body' => 'Mesej', 'audience' => 'users']);
    $item->users()->attach($user);
    $this->actingAs($other)->postJson(route('announcements.viewed', $item))->assertForbidden();
    $this->actingAs($user)->postJson(route('announcements.viewed', $item))->assertOk();
    $first = $item->viewers()->first()->pivot->viewed_at;
    $this->travel(1)->hour();
    $this->postJson(route('announcements.viewed', $item))->assertOk();
    expect($item->viewers()->count())->toBe(1);
    expect($item->viewers()->first()->pivot->viewed_at)->toBe($first);
    $this->get(route('profile.edit'))->assertInertia(fn ($page) => $page->missing('pendingAnnouncements.0.viewers'));
    $this->actingAs($admin)->get(route('admin.announcements.index'))->assertInertia(fn ($page) => $page->where('announcements.data.0.viewers.0.name', $user->name));
});

it('includes the recipient UDM in the selection list', function () {
    $admin = User::factory()->masterAdmin()->create();
    $user = User::factory()->create(['name' => 'AAA Penerima UDM', 'access_level' => 'udm', 'scope_key' => 'BUKIT']);
    $this->actingAs($admin)->get(route('admin.announcements.index'))->assertInertia(fn ($page) => $page->where('users.0.id', $user->id)->where('users.0.udm', 'BUKIT'));
});

it('accepts posters up to 20 MB and rejects larger posters', function () {
    Storage::fake('local');
    $admin = User::factory()->masterAdmin()->create();
    $data = ['title' => 'Poster besar', 'type' => 'poster', 'audience' => 'all'];
    $this->actingAs($admin)->post(route('admin.announcements.store'), [...$data, 'poster' => UploadedFile::fake()->image('poster.png')->size(20480)])->assertSessionHasNoErrors()->assertRedirect();
    $this->post(route('admin.announcements.store'), [...$data, 'poster' => UploadedFile::fake()->image('poster.png')->size(20481)])->assertSessionHasErrors('poster');
});

it('only displays announcements within their optional schedule including the expiry day', function () {
    $this->travelTo(now()->setDate(2026, 11, 11)->startOfDay());
    $user = User::factory()->withModules(['dashboard'])->create();
    foreach ([['Tiada jadual', null, null], ['Hari ini', '2026-11-11', '2026-11-11'], ['Akan datang', '2026-11-12', null], ['Tamat', null, '2026-11-10']] as [$title, $start, $end]) {
        Announcement::create(['title' => $title, 'body' => 'Mesej', 'audience' => 'all', 'starts_at' => $start, 'expires_at' => $end]);
    }
    expect(Announcement::forRecipient($user)->pluck('title')->all())->toBe(['Tiada jadual', 'Hari ini']);
    $admin = User::factory()->masterAdmin()->create();
    $this->actingAs($admin)->post(route('admin.announcements.store'), ['title' => 'Jadual', 'type' => 'text', 'body' => 'Mesej', 'audience' => 'all', 'starts_at' => '2026-11-12', 'expires_at' => '2026-11-11'])->assertSessionHasErrors('expires_at');
    $this->post(route('admin.announcements.store'), ['title' => 'Jadual sah', 'type' => 'text', 'body' => 'Mesej', 'audience' => 'all', 'starts_at' => '2026-11-12', 'expires_at' => '2026-11-13'])->assertRedirect();
    $this->assertDatabaseHas('announcements', ['title' => 'Jadual sah', 'starts_at' => '2026-11-12 00:00:00', 'expires_at' => '2026-11-13 00:00:00']);
});

it('lets only master admin publish announcements', function () {
    $admin = User::factory()->masterAdmin()->create();
    $this->actingAs($admin)->get(route('admin.announcements.index'))->assertOk();
    $this->post(route('admin.announcements.store'), ['title' => 'Makluman', 'type' => 'text', 'body' => 'Mesej', 'audience' => 'all'])->assertRedirect();
    $this->assertDatabaseHas('announcements', ['title' => 'Makluman']);
    $this->actingAs(User::factory()->withModules(['dashboard'])->create())
        ->postJson(route('admin.announcements.store'), ['title' => 'Tidak dibenarkan'])->assertForbidden();
});

it('targets roles and individuals and persists dismissals per user', function () {
    $user = User::factory()->withModules(['dashboard'])->create();
    $other = User::factory()->withModules(['dashboard'])->create();
    $role = Announcement::create(['title' => 'Role', 'body' => 'Mesej', 'audience' => 'roles']);
    $role->roles()->attach($user->role_id);
    $personal = Announcement::create(['title' => 'Personal', 'body' => 'Mesej', 'audience' => 'users']);
    $personal->users()->attach($user);
    expect(Announcement::forRecipient($user)->count())->toBe(2);
    expect(Announcement::forRecipient($other)->count())->toBe(0);
    $this->actingAs($user)->postJson(route('announcements.dismiss', $personal))->assertOk();
    $this->get(route('profile.edit'))->assertInertia(fn ($page) => $page->has('pendingAnnouncements', 1)->where('pendingAnnouncements.0.id', $role->id));
    $this->actingAs($other)->postJson(route('announcements.dismiss', $personal))->assertForbidden();
});

it('validates content and recipients and protects private posters', function () {
    Storage::fake('local');
    $admin = User::factory()->masterAdmin()->create();
    $user = User::factory()->withModules(['dashboard'])->create();
    $this->actingAs($admin)->post(route('admin.announcements.store'), ['title' => 'Poster', 'type' => 'poster', 'audience' => 'users', 'user_ids' => []])->assertSessionHasErrors(['poster', 'user_ids']);
    $this->post(route('admin.announcements.store'), ['title' => 'Poster', 'type' => 'poster', 'audience' => 'users', 'user_ids' => [$user->id], 'poster' => UploadedFile::fake()->image('poster.png')])->assertRedirect();
    $item = Announcement::firstOrFail();
    Storage::disk('local')->assertExists($item->poster_path);
    $this->actingAs($user)->get(route('announcements.poster', $item))->assertOk();
    $this->actingAs(User::factory()->withModules(['dashboard'])->create())->getJson(route('announcements.poster', $item))->assertForbidden();
    $this->actingAs($admin)->put(route('admin.announcements.update', $item), ['is_active' => false])->assertRedirect();
    expect(Announcement::forRecipient($user)->count())->toBe(0);
    $this->delete(route('admin.announcements.destroy', $item))->assertRedirect();
    Storage::disk('local')->assertMissing($item->poster_path);
});
