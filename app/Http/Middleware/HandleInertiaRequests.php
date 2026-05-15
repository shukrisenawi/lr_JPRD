<?php

namespace App\Http\Middleware;

use App\Support\ModuleRegistry;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user()
                    ? [
                        'id' => $request->user()->id,
                        'name' => $request->user()->name,
                        'email' => $request->user()->email,
                        'email_verified_at' => $request->user()->email_verified_at,
                        'avatar_url' => $request->user()->avatarUrl(),
                        'role' => $request->user()->role
                            ? [
                                'id' => $request->user()->role->id,
                                'name' => $request->user()->role->name,
                                'slug' => $request->user()->role->slug,
                                'is_master_admin' => $request->user()->role->is_master_admin,
                            ]
                            : null,
                        'allowed_modules' => collect(ModuleRegistry::keys())
                            ->filter(fn (string $module) => $request->user()->canAccessModule($module))
                            ->values()
                            ->all(),
                        'must_change_password' => (bool) $request->user()->must_change_password,
                    ]
                    : null,
                'impersonation' => [
                    'is_active' => $request->session()->has('impersonator_id'),
                    'impersonator' => $request->session()->has('impersonator_id')
                        ? User::query()
                            ->select(['id', 'name', 'email'])
                            ->find($request->session()->get('impersonator_id'))
                            ?->only(['id', 'name', 'email'])
                        : null,
                ],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
