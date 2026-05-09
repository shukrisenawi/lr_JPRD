<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Support\ModuleRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
                    'role' => $user->role
                        ? [
                            'id' => $user->role->id,
                            'name' => $user->role->name,
                            'slug' => $user->role->slug,
                        ]
                        : null,
                ])
                ->values(),
            'modules' => collect(ModuleRegistry::all())
                ->map(fn (array $module, string $key) => [
                    'key' => $key,
                    'label' => $module['label'],
                    'description' => $module['description'],
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
        ]);

        User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'email_verified_at' => now(),
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
        ]);

        return redirect()
            ->route('admin.access.index')
            ->with('success', 'Pengguna baharu berjaya dicipta.');
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
