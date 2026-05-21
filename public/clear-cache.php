<?php
/**
 * Clear Laravel Cache Script
 * Upload this file to your public/ folder and access via browser
 * Example: https://yourdomain.com/clear-cache.php
 */

try {
    require __DIR__.'/../vendor/autoload.php';
    $app = require_once __DIR__.'/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    $results = [];
    
    // Clear config cache
    $results[] = 'Config: ' . (Illuminate\Support\Facades\Artisan::call('config:clear') === 0 ? '✓ Cleared' : '✗ Failed');
    
    // Clear application cache
    $results[] = 'Cache: ' . (Illuminate\Support\Facades\Artisan::call('cache:clear') === 0 ? '✓ Cleared' : '✗ Failed');
    
    // Clear route cache
    $results[] = 'Route: ' . (Illuminate\Support\Facades\Artisan::call('route:clear') === 0 ? '✓ Cleared' : '✗ Failed');
    
    // Clear view cache
    $results[] = 'View: ' . (Illuminate\Support\Facades\Artisan::call('view:clear') === 0 ? '✓ Cleared' : '✗ Failed');
    
    // Clear compiled classes
    $results[] = 'Compiled: ' . (Illuminate\Support\Facades\Artisan::call('clear-compiled') === 0 ? '✓ Cleared' : '✗ Failed');
    
    echo "<h2>🧹 Laravel Cache Cleared!</h2>";
    echo "<pre>";
    foreach ($results as $result) {
        echo $result . "\n";
    }
    echo "</pre>";
    echo "<p><strong>Timestamp:</strong> " . date('Y-m-d H:i:s') . "</p>";
    echo "<p style='color: red; font-weight: bold;'>⚠️ DELETE THIS FILE AFTER USE FOR SECURITY!</p>";
    
} catch (Exception $e) {
    echo "<h2>❌ Error</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
