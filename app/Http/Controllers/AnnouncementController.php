<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Cawangan;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->isMasterAdmin(), 403);
        $cawanganUdm = Cawangan::pluck('udm', 'id');

        return Inertia::render('Admin/Announcements', [
            'announcements' => Announcement::with(['roles:id,name', 'users:id,name', 'viewers:id,name'])->latest('id')->paginate(20)->through(fn ($item) => [...$item->popupData(), 'audience' => $item->audience, 'is_active' => $item->is_active, 'starts_at' => $item->starts_at?->format('Y-m-d'), 'expires_at' => $item->expires_at?->format('Y-m-d'), 'roles' => $item->roles, 'users' => $item->users, 'viewers' => $item->viewers->map(fn ($user) => ['id' => $user->id, 'name' => $user->name, 'viewed_at' => $user->pivot->viewed_at])]),
            'roles' => Role::orderBy('name')->get(['id', 'name']),
            'users' => User::orderBy('name')->get(['id', 'name', 'email', 'access_level', 'scope_key'])
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'udm' => match ($user->access_level) {
                        'udm' => $user->scope_key,
                        'cawangan' => $cawanganUdm->get($user->scope_key) ?? explode('|', $user->scope_key ?? '')[0],
                        default => null,
                    },
                ]),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->isMasterAdmin(), 403);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['text', 'poster'])],
            'body' => ['required_if:type,text', 'nullable', 'string', 'max:20000'],
            'poster' => ['required_if:type,poster', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:20480'],
            'audience' => ['required', Rule::in(['all', 'roles', 'users'])],
            'role_ids' => ['required_if:audience,roles', 'array'],
            'role_ids.*' => ['integer', 'distinct', 'exists:roles,id'],
            'user_ids' => ['required_if:audience,users', 'array'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'starts_at' => ['nullable', 'date_format:Y-m-d'],
            'expires_at' => ['nullable', 'date_format:Y-m-d', Rule::when($request->filled('starts_at'), ['after_or_equal:starts_at'])],
        ]);
        $path = $data['type'] === 'poster' ? $request->file('poster')->store('announcements', 'local') : null;
        try {
            DB::transaction(function () use ($data, $path) {
                $announcement = Announcement::create(['title' => $data['title'], 'body' => $data['body'] ?? null, 'poster_path' => $path, 'audience' => $data['audience'], 'starts_at' => $data['starts_at'] ?? null, 'expires_at' => $data['expires_at'] ?? null]);
                $announcement->roles()->sync($data['audience'] === 'roles' ? $data['role_ids'] : []);
                $announcement->users()->sync($data['audience'] === 'users' ? $data['user_ids'] : []);
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return back()->with('success', 'Pengumuman berjaya dihantar.');
    }

    public function update(Request $request, Announcement $announcement)
    {
        abort_unless($request->user()->isMasterAdmin(), 403);
        $announcement->update($request->validate(['is_active' => ['required', 'boolean']]));

        return back()->with('success', 'Status pengumuman dikemas kini.');
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        abort_unless($request->user()->isMasterAdmin(), 403);
        $path = $announcement->poster_path;
        $announcement->delete();
        if ($path) {
            Storage::disk('local')->delete($path);
        }

        return back()->with('success', 'Pengumuman dipadam.');
    }

    public function dismiss(Request $request, Announcement $announcement)
    {
        abort_unless(Announcement::forRecipient($request->user())->whereKey($announcement->id)->exists(), 403);
        $announcement->dismissals()->syncWithoutDetaching([$request->user()->id]);

        return response()->json(['ok' => true]);
    }

    public function viewed(Request $request, Announcement $announcement)
    {
        abort_unless(Announcement::forRecipient($request->user())->whereKey($announcement->id)->exists(), 403);
        DB::table('announcement_views')->insertOrIgnore([
            'announcement_id' => $announcement->id,
            'user_id' => $request->user()->id,
            'viewed_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function poster(Request $request, Announcement $announcement)
    {
        abort_unless($request->user()->isMasterAdmin() || Announcement::forRecipient($request->user())->whereKey($announcement->id)->exists(), 403);
        abort_unless($announcement->poster_path && Storage::disk('local')->exists($announcement->poster_path), 404);

        return Storage::disk('local')->response($announcement->poster_path, null, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
