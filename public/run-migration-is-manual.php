<?php
// 1. Bootstrap Laravel
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(
    Illuminate\Http\Request::capture()
);

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

$output = [];

try {
    if (!Schema::hasColumn('pemilih_records', 'is_manual')) {
        Schema::table('pemilih_records', function ($table) {
            $table->boolean('is_manual')->default(false)->after('source_file');
        });
        $output[] = 'Column is_manual added successfully.';
    } else {
        $output[] = 'Column is_manual already exists.';
    }
} catch (\Exception $e) {
    $output[] = 'Error: ' . $e->getMessage();
}

echo '<pre>' . implode("\n", $output) . '</pre>';

// 3. Self-delete after execution
// comment out the line below if you want to keep the file
// unlink(__FILE__);
