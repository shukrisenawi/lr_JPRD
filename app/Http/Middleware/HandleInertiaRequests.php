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
                        'access_level' => $request->user()->access_level,
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
                        'must_change_password' => $request->session()->has('impersonator_id') ? false : (bool) $request->user()->must_change_password,
                        'is_expired' => $request->user()->isExpired(),
                        'preferences' => $request->user()->preferences ?? [],
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
                'warning' => fn () => $request->session()->get('warning'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'badgeCounts' => [
                'pusatKhidmatBelumSemak' => $this->getPusatKhidmatBelumSemakCount($request->user()),
            ],
        ];
    }

    public function getPusatKhidmatBelumSemakCount($user): int
    {
        if (!$user) return 0;
        
        try {
            $query = \App\Models\PusatKhidmatData::query()
                ->whereNotNull('no_kp')
                ->where('no_kp', '!=', '');
            
            if ($user->access_level === 'udm' || $user->access_level === 'cawangan') {
                $query->whereHas('pemilihRecord', function ($q) use ($user) {
                    if ($user->access_level === 'udm') {
                        $q->where('dm', $user->scope_key);
                    } else {
                        $scopeParts = explode('|', $user->scope_key);
                        if (count($scopeParts) >= 2) {
                            $q->where('dm', $scopeParts[0])->where('locality', $scopeParts[1]);
                        }
                    }
                });
            }
            
            return $query->count();
        } catch (\Exception $e) {
            return 0;
        }
    }
}
