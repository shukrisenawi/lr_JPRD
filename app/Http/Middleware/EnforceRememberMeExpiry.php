<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Response;

class EnforceRememberMeExpiry
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->cookie('rm_7d')) {
            $expiresAt = (int) $request->cookie('rm_7d');

            if (now()->timestamp > $expiresAt) {
                $rememberName = Auth::guard()->getRecallerName();

                Auth::logout();

                $request->session()->invalidate();
                $request->session()->regenerateToken();

                Cookie::queue(Cookie::forget($rememberName));
                Cookie::queue(Cookie::forget('rm_7d'));

                return redirect()->route('login')->with('error', 'Sesi log masuk telah tamat tempoh 7 hari.');
            }
        }

        return $next($request);
    }
}
