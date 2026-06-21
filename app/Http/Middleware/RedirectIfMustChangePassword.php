<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfMustChangePassword
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->expires_at && $user->expires_at->isPast()) {
            auth()->guard()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Akaun anda telah luput. Sila hubungi admin.');
        }

        if ($user && (bool) $user->must_change_password && ! $request->session()->has('impersonator_id') && ! $request->routeIs('profile.edit') && ! $request->routeIs('profile.update') && ! $request->routeIs('logout')) {
            return redirect()->route('profile.edit')->with('error', 'Sila tukar kata laluan anda sebelum meneruskan.');
        }

        return $next($request);
    }
}
