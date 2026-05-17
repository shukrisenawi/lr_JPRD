<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')
            ->where('is_master_admin', false)
            ->whereRaw('JSON_CONTAINS(access_modules, \'"culaan.laporan"\')')
            ->whereRaw('NOT JSON_CONTAINS(access_modules, \'"culaan.jadual"\')')
            ->update([
                'access_modules' => DB::raw('JSON_ARRAY_APPEND(access_modules, \'$\', \'culaan.jadual\')'),
            ]);
    }

    public function down(): void
    {
        DB::table('roles')
            ->whereRaw('JSON_CONTAINS(access_modules, \'"culaan.jadual"\')')
            ->update([
                'access_modules' => DB::raw('JSON_REMOVE(access_modules, JSON_UNQUOTE(JSON_SEARCH(access_modules, \'one\', \'culaan.jadual\')))'),
            ]);
    }
};
