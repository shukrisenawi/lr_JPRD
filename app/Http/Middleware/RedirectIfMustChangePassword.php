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

        if ($user && (bool) $user->must_change_password && ! $request->routeIs('profile.edit') && ! $request->routeIs('profile.update') && ! $request->routeIs('logout')) {
            return redirect()->route('profile.edit')->with('error', 'Sila tukar kata laluan anda sebelum meneruskan.');
        }

        return $next($request);
    }
}
