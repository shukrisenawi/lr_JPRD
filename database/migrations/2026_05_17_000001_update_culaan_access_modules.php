<?php

use App\Support\ModuleRegistry;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $children = ModuleRegistry::children('culaan');
        $childKeys = array_keys($children);

        if (empty($childKeys)) {
            return;
        }

        $childKeysJson = collect($childKeys)->map(fn (string $k) => '"'.$k.'"')->implode(',');

        DB::statement("
            UPDATE roles
            SET access_modules = JSON_ARRAY({$childKeysJson})
            WHERE JSON_CONTAINS(access_modules, '\"culaan\"')
        ");
    }

    public function down(): void
    {
        DB::statement("
            UPDATE roles
            SET access_modules = JSON_ARRAY('culaan')
            WHERE JSON_CONTAINS(access_modules, '\"culaan.senarai\"')
               OR JSON_CONTAINS(access_modules, '\"culaan.laporan\"')
        ");
    }
};
