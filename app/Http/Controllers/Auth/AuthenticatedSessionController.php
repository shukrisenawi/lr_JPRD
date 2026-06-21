<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Support\ModuleRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        $dbUsername = config('database.connections.mysql.username');
        $shouldPrefillAdmin = config('app.env') === 'local' && $dbUsername === 'root';

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'defaultCredentials' => $shouldPrefillAdmin
                ? [
                    'email' => 'admin@jprd',
                    'password' => '123',
                ]
                : null,
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();
        $user->update(['last_login_at' => now()]);

        if ($request->input('password') === '123') {
            $user->update(['must_change_password' => true]);

            return redirect()->route('profile.edit');
        }

        return redirect()->intended($this->firstAccessibleRoute($request));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }

    private function firstAccessibleRoute(Request $request): string
    {
        $user = $request->user();
        $moduleRoutes = [
            'dashboard' => 'dashboard',
            'laporan' => 'laporan.index',
            'carian-pemilih' => 'carian-pemilih.index',
            'program' => 'program.index',
            'jawatankuasa' => 'jawatankuasa.index',
            'culaan' => 'culaan.index',
            'settings' => 'settings.edit',
        ];

        foreach (ModuleRegistry::keys() as $module) {
            if ($user?->canAccessModule($module) && isset($moduleRoutes[$module])) {
                return route($moduleRoutes[$module], absolute: false);
            }
        }

        return route('profile.edit', absolute: false);
    }
}
