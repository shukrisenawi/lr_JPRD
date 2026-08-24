<?php

use App\Http\Middleware\EnsureModuleAccess;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectIfMustChangePassword;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'carian-pemilih/update-no-ahli',
        ]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            RedirectIfMustChangePassword::class,
        ]);

        $middleware->alias([
            'module' => EnsureModuleAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (HttpExceptionInterface $exception, Request $request) {
            if ($exception->getStatusCode() === 403 && ! $request->expectsJson() && $request->user()) {
                $previousUrl = $request->session()->get('_previous.url');
                $previousPath = is_string($previousUrl) ? parse_url($previousUrl, PHP_URL_PATH) : null;

                if ($previousPath === null || $previousPath === $request->getPathInfo()) {
                    return redirect()
                        ->route('profile.edit')
                        ->with('error', 'Anda tidak mempunyai akses ke halaman ini.');
                }

                return redirect()
                    ->back()
                    ->with('error', 'Anda tidak mempunyai akses ke halaman ini.');
            }

            return null;
        });
    })->create();
