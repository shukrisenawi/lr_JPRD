<?php

/**
 * Deployment Checker & Fix Helper
 * Letakkan fail ini di root project (selevel .env) dan akses melalui browser
 * untuk semak isu gambar/asset di server.
 *
 * CONTOH: https://domain-anda.com/sistem/public/deploy-check.php
 */

echo "<h1>Deployment Checker - LR JPRD</h1><hr>";

$issues = [];
$fixes = [];

// 1. Check APP_URL
$envPath = __DIR__ . '/.env';
$envContent = file_exists($envPath) ? file_get_contents($envPath) : '';

if (preg_match('/APP_URL=(.+)/', $envContent, $m)) {
    $appUrl = trim($m[1]);
    echo "<p><strong>APP_URL:</strong> {$appUrl}</p>";
    if (str_contains($appUrl, '127.0.0.1') || str_contains($appUrl, 'localhost')) {
        $issues[] = "APP_URL masih localhost ({$appUrl}).";
        $fixes[] = "Tukar APP_URL dalam .env kepada URL sebenar server.";
    }
} else {
    $issues[] = "APP_URL tidak dijumpai dalam .env";
}

// 2. Check current request URL
$scheme = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'unknown';
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$basePath = str_replace('/deploy-check.php', '', $requestUri);
echo "<p><strong>URL semasa:</strong> {$scheme}://{$host}{$requestUri}</strong></p>";
echo "<p><strong>Base path:</strong> {$basePath}</p>";

if (!empty($issues)) {
    echo "<h2 style='color:red'>Isu Dijumpai:</h2><ul>";
    foreach ($issues as $issue) {
        echo "<li>{$issue}</li>";
    }
    echo "</ul>";

    echo "<h2 style='color:green'>Langkah Penyelesaian:</h2><ol>";
    foreach ($fixes as $fix) {
        echo "<li>{$fix}</li>";
    }
    echo "</ol>";
} else {
    echo "<p style='color:green'>Tiada isu utama dijumpai!</p>";
}

// 3. Check build assets
echo "<h2>Build Assets</h2>";
$manifestPath = __DIR__ . '/public/build/manifest.json';
if (file_exists($manifestPath)) {
    echo "<p style='color:green'>manifest.json wujud</p>";
} else {
    echo "<p style='color:red'>manifest.json TIDAK wujud! Run: npm run build</p>";
}

// 4. Check storage symlink
$storageLink = __DIR__ . '/public/storage';
if (is_link($storageLink) || is_dir($storageLink)) {
    echo "<p style='color:green'>public/storage wujud</p>";
} else {
    echo "<p style='color:red'>public/storage symlink TIDAK wujud! Run: php artisan storage:link</p>";
}

// 5. Check image files
echo "<h2>Fail Gambar</h2>";
$logoPath = __DIR__ . '/public/images/logo-pas-sik.png';
if (file_exists($logoPath)) {
    echo "<p style='color:green'>Logo wujud</p>";
} else {
    echo "<p style='color:red'>Logo TIDAK wujud</p>";
}

$avatarDir = __DIR__ . '/storage/app/public/avatars';
if (is_dir($avatarDir)) {
    $avatars = glob($avatarDir . '/*');
    echo "<p>Avatars: " . count($avatars) . " fail</p>";
} else {
    echo "<p style='color:red'>Direktori avatars tidak wujud</p>";
}

$programDir = __DIR__ . '/storage/app/public/programs';
if (is_dir($programDir)) {
    $programs = glob($programDir . '/*');
    echo "<p>Gambar program: " . count($programs) . " fail</p>";
} else {
    echo "<p style='color:red'>Direktori programs tidak wujud</p>";
}

echo "<hr><h2>Senarai Tindakan di Server</h2>";
echo "<ol>";
echo "<li><strong>Edit .env:</strong><br>APP_URL=https://domain-anda.com/sistem/public<br>VITE_BASE_PATH=/sistem/public/build/</li>";
echo "<li><strong>Clear cache:</strong> php artisan config:clear && php artisan cache:clear</li>";
echo "<li><strong>Storage link:</strong> php artisan storage:link (jika belum)</li>";
echo "<li><strong>Build assets:</strong> npm run build (jika belum)</li>";
echo "<li><strong>Permission:</strong> chmod -R 755 storage/ bootstrap/cache/</li>";
echo "</ol>";

// Auto-suggestion
$suggestedUrl = $scheme . '://' . $host . $basePath;
echo "<hr><p><strong>Cadangan APP_URL untuk server ini:</strong><br><code>APP_URL={$suggestedUrl}</code></p>";

// Delete warning
echo "<hr><p style='color:orange'><strong>Nota:</strong> Padam fail ini (deploy-check.php) selepas guna untuk keselamatan.</p>";
