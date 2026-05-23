<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Auto-deteksi URL sebenar di server sekiranya APP_URL masih localhost.
        // Ini memastikan semua URL gambar dan asset dijana dengan betul
        // walaupun APP_URL dalam .env tersalah/tidak dikemaskini.
        if (! $this->app->environment('local')) {
            $appUrl = config('app.url');

            if (str_contains($appUrl, '127.0.0.1') || str_contains($appUrl, 'localhost')) {
                /** @var string $scheme */
                $scheme = request()->getScheme() ?? 'https';
                /** @var string $host */
                $host = request()->getHost() ?? '';
                /** @var string $base */
                $base = request()->getBasePath() ?? '';

                if ($host !== '' && ! in_array($host, ['localhost', '127.0.0.1'], true)) {
                    $detected = $scheme.'://'.$host.rtrim($base, '/');
                    URL::forceRootUrl($detected);
                }
            }

            // Paksa HTTPS supaya tidak ada isu mixed-content di production
            if ($this->app->environment('production')) {
                URL::forceScheme('https');
            }
        }
    }
}
