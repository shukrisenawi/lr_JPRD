<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
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
    private const LAST_USER_COOKIE = 'last_user';

    /**
     * Display the login view.
     */
    public function create(): Response
    {
        $dbUsername = config('database.connections.mysql.username');
        $shouldPrefillAdmin = config('app.env') === 'local' && $dbUsername === 'root';

        $lastUser = $this->readLastUserCookie();
        $defaultCredentials = $shouldPrefillAdmin
            ? [
                'email' => 'admin@jprd',
                'password' => '123',
            ]
            : null;

        $payload = [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
            'lastUser' => $lastUser,
            'defaultCredentials' => $defaultCredentials,
        ];

        if ($lastUser !== null) {
            $payload['defaultCredentials'] = [
                'email' => $lastUser['email'],
                'password' => '',
            ];
        }

        return Inertia::render('Auth/Login', $payload);
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

        $this->writeLastUserCookie($user);

        if ($request->input('password') === '123' && !$user->isMasterAdmin()) {
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

    /**
     * Forget the last user hint so the email field is shown again.
     */
    public function forgetLastUser(Request $request): RedirectResponse
    {
        Cookie::queue(Cookie::forget(self::LAST_USER_COOKIE));

        return redirect()->route('login');
    }

    private function firstAccessibleRoute(Request $request): string
    {
        $user = $request->user();
        $moduleRoutes = [
            'laporan' => 'laporan.index',
            'dashboard' => 'dashboard',
            'carian-pemilih' => 'carian-pemilih.index',
            'program' => 'program.index',
            'jawatankuasa' => 'jawatankuasa.index',
            'culaan' => 'culaan.index',
            'culaan-bot' => 'culaan-bot.index',
            'settings' => 'settings.edit',
        ];

        foreach (ModuleRegistry::keys() as $module) {
            if ($user?->canAccessModule($module) && isset($moduleRoutes[$module])) {
                return route($moduleRoutes[$module], absolute: false);
            }
        }

        return route('profile.edit', absolute: false);
    }

    /**
     * @return array{email: string, name: string, avatar: ?string}|null
     */
    private function readLastUserCookie(): ?array
    {
        /** @var \Illuminate\Http\Request $req */
        $req = request();
        $raw = $req->cookie(self::LAST_USER_COOKIE);

        if (! is_string($raw) || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);

        if (! is_array($decoded) || ! isset($decoded['email'], $decoded['name'])) {
            return null;
        }

        if (! is_string($decoded['email']) || ! is_string($decoded['name'])) {
            return null;
        }

        return [
            'email' => (string) $decoded['email'],
            'name' => (string) $decoded['name'],
        ];
    }

    private function writeLastUserCookie(User $user): void
    {
        $payload = json_encode([
            'email' => $user->email,
            'name' => $user->name,
        ], JSON_UNESCAPED_UNICODE);

        Cookie::queue(Cookie::make(
            self::LAST_USER_COOKIE,
            $payload,
            60 * 24 * 30,
            '/',
            null,
            false,
            false,
            false,
            'strict'
        ));
    }
}