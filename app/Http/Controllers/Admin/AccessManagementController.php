<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PemilihRecord;
use App\Models\Role;
use App\Models\User;
use App\Support\ModuleRegistry;
use Illuminate\Auth\AuthManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AccessManagementController extends Controller
{
    public function index(): Response
    {
        abort_unless(request()->user()?->isMasterAdmin(), 403);

        return Inertia::render('Admin/AccessManagement', [
            'roles' => Role::query()
                ->orderByDesc('is_master_admin')
                ->orderBy('name')
                ->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'slug' => $role->slug,
                    'is_master_admin' => $role->is_master_admin,
                    'access_modules' => $role->is_master_admin
                        ? ModuleRegistry::keys()
                        : ($role->access_modules ?? []),
                    'user_count' => $role->users()->count(),
                ])
                ->values(),
            'users' => User::query()
                ->with('role')
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatarUrl(),
                    'last_login_at' => $user->last_login_at?->format('d-m-Y'),
                    'expires_at' => $user->expires_at?->format('Y-m-d'),
                    'can_impersonate' => ! request()->user()->is($user),
                    'access_level' => $user->access_level ?? 'jprd',
                    'scope_key' => $user->scope_key,
                    'role' => $user->role
                        ? [
                            'id' => $user->role->id,
                            'name' => $user->role->name,
                            'slug' => $user->role->slug,
                            'is_master_admin' => (bool) $user->role->is_master_admin,
                        ]
                        : null,
                ])
                ->values(),
            'udms' => PemilihRecord::query()
                ->where('status', 'aktif')
                ->where('is_manual', false)
                ->whereNotNull('dm')
                ->where('dm', '!=', '')
                ->select('dm')
                ->distinct()
                ->orderBy('dm')
                ->pluck('dm')
                ->all(),
            'cawangans' => PemilihRecord::query()
                ->where('status', 'aktif')
                ->where('is_manual', false)
                ->whereNotNull('dm')
                ->where('dm', '!=', '')
                ->whereNotNull('locality')
                ->where('locality', '!=', '')
                ->select('dm', 'locality')
                ->distinct()
                ->orderBy('dm')
                ->orderBy('locality')
                ->get()
                ->map(fn (PemilihRecord $r) => [
                    'key' => $r->dm.'|'.$r->locality,
                    'name' => $r->locality,
                    'dm' => $r->dm,
                ])
                ->values()
                ->all(),
            'modules' => collect(ModuleRegistry::all())
                ->map(fn (array $module, string $key) => [
                    'key' => $key,
                    'label' => $module['label'],
                    'description' => $module['description'],
                    'children' => isset($module['children'])
                        ? collect($module['children'])->map(fn (array $child, string $childKey) => [
                            'key' => $childKey,
                            'label' => $child['label'],
                        ])->values()->all()
                        : [],
                ])
                ->values(),
        ]);
    }

    public function storeUser(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isMasterAdmin(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'min:3'],
            'role_id' => ['required', Rule::exists('roles', 'id')],
            'access_level' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
            'scope_key' => ['nullable', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date'],
        ]);

        User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'email_verified_at' => now(),
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
            'access_level' => $validated['access_level'],
            'scope_key' => $validated['access_level'] === 'jprd' ? null : $validated['scope_key'],
            'expires_at' => $validated['expires_at'],
        ]);

        return redirect()
            ->route('admin.access.index')
            ->with('success', 'Pengguna baharu berjaya dicipta.');
    }

    public function updateUser(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isMasterAdmin(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'confirmed', 'min:3'],
            'role_id' => ['required', Rule::exists('roles', 'id')],
            'access_level' => ['required', Rule::in(['jprd', 'udm', 'cawangan'])],
            'scope_key' => ['nullable', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $updates = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role_id' => $validated['role_id'],
            'access_level' => $validated['access_level'],
            'scope_key' => $validated['access_level'] === 'jprd' ? null : $validated['scope_key'],
            'expires_at' => $validated['expires_at'],
        ];

        if (filled($validated['password'] ?? null)) {
            $updates['password'] = Hash::make($validated['password']);
        }

        $user->update($updates);

        return redirect()
            ->route('admin.access.index')
            ->with('success', 'Pengguna berjaya dikemaskini.');
    }

    public function destroyUser(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isMasterAdmin(), 403);

        if ($request->user()->is($user)) {
            return redirect()
                ->route('admin.access.index')
                ->with('error', 'Anda tidak boleh padam akaun sendiri dari modul ini.');
        }

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->delete();

        return redirect()
            ->route('admin.access.index')
            ->with('success', 'Pengguna berjaya dipadam.');
    }

    public function impersonateUser(Request $request, User $user, AuthManager $auth): RedirectResponse
    {
        abort_unless($request->user()?->isMasterAdmin(), 403);

        if ($request->user()->is($user)) {
            return redirect()
                ->route('admin.access.index')
                ->with('error', 'Anda sudah berada pada akaun ini.');
        }

        $impersonatorId = (int) $request->user()->id;

        $auth->guard()->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $auth->guard()->loginUsingId($user->id);
        $request->session()->regenerate();
        $request->session()->put('impersonator_id', $impersonatorId);
        $request->session()->forget('url.intended');

        return redirect()
            ->route($user->canAccessModule('dashboard') ? 'dashboard' : 'profile.edit')
            ->with('success', "Anda kini melihat sistem sebagai {$user->name}.");
    }

    public function stopImpersonation(Request $request, AuthManager $auth): RedirectResponse
    {
        $impersonatorId = (int) $request->session()->get('impersonator_id', 0);
        $impersonator = User::query()->find($impersonatorId);

        abort_unless($impersonator?->isMasterAdmin(), 403);

        $auth->guard()->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $auth->guard()->loginUsingId($impersonator->id);
        $request->session()->regenerate();
        $request->session()->forget('url.intended');

        return redirect()
            ->route('admin.access.index')
            ->with('success', 'Anda kembali sebagai master admin.');
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isMasterAdmin(), 403);

        if ($request->user()->is($user)) {
            return redirect()
                ->route('admin.access.index')
                ->with('error', 'Anda tidak boleh reset kata laluan akaun sendiri.');
        }

        $user->update([
            'password' => Hash::make('123'),
            'must_change_password' => true,
        ]);

        return redirect()
            ->route('admin.access.index')
            ->with('success', "Kata laluan {$user->name} telah direset kepada 123.");
    }

    public function storeRole(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isMasterAdmin(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'access_modules' => ['nullable', 'array'],
            'access_modules.*' => ['string', Rule::in(ModuleRegistry::keys())],
        ]);

        Role::query()->create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'access_modules' => array_values(array_unique($validated['access_modules'] ?? [])),
        ]);

        return redirect()
            ->route('admin.access.index')
            ->with('success', 'Group role baharu berjaya dicipta.');
    }

    public function updateRole(Request $request, Role $role): RedirectResponse
    {
        abort_unless($request->user()?->isMasterAdmin(), 403);

        if ($role->is_master_admin) {
            return redirect()
                ->route('admin.access.index')
                ->with('error', 'Role master admin sentiasa mempunyai akses penuh.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)],
            'access_modules' => ['nullable', 'array'],
            'access_modules.*' => ['string', Rule::in(ModuleRegistry::keys())],
        ]);

        $role->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'access_modules' => array_values(array_unique($validated['access_modules'] ?? [])),
        ]);

        return redirect()
            ->route('admin.access.index')
            ->with('success', 'Akses modul untuk group role berjaya dikemaskini.');
    }
}
