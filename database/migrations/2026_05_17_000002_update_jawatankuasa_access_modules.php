<?php

use App\Support\ModuleRegistry;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $children = ModuleRegistry::children('jawatankuasa');
        $childKeys = array_keys($children);

        if (empty($childKeys)) {
            return;
        }

        $childKeysJson = collect($childKeys)->map(fn (string $k) => '"'.$k.'"')->implode(',');

        DB::statement("
            UPDATE roles
            SET access_modules = JSON_ARRAY({$childKeysJson})
            WHERE JSON_CONTAINS(access_modules, '\"jawatankuasa\"')
        ");
    }

    public function down(): void
    {
        DB::statement("
            UPDATE roles
            SET access_modules = JSON_ARRAY('jawatankuasa')
            WHERE JSON_CONTAINS(access_modules, '\"jawatankuasa.senarai\"')
               OR JSON_CONTAINS(access_modules, '\"jawatankuasa.jawatan\"')
        ");
    }
};
