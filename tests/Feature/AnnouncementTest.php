<?php

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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
