<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::table('roles')
                ->where('is_master_admin', false)
                ->get()
                ->each(function ($role): void {
                    $modules = json_decode($role->access_modules ?? '[]', true) ?: [];

                    if (in_array('culaan.laporan', $modules, true) && ! in_array('culaan.jadual', $modules, true)) {
                        $modules[] = 'culaan.jadual';
                        DB::table('roles')->where('id', $role->id)->update([
                            'access_modules' => json_encode($modules),
                        ]);
                    }
                });

            return;
        }

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
        if (DB::getDriverName() === 'sqlite') {
            DB::table('roles')->get()->each(function ($role): void {
                $modules = json_decode($role->access_modules ?? '[]', true) ?: [];
                $filteredModules = array_values(array_filter($modules, fn (string $module): bool => $module !== 'culaan.jadual'));

                if ($filteredModules !== $modules) {
                    DB::table('roles')->where('id', $role->id)->update([
                        'access_modules' => json_encode($filteredModules),
                    ]);
                }
            });

            return;
        }

        DB::table('roles')
            ->whereRaw('JSON_CONTAINS(access_modules, \'"culaan.jadual"\')')
            ->update([
                'access_modules' => DB::raw('JSON_REMOVE(access_modules, JSON_UNQUOTE(JSON_SEARCH(access_modules, \'one\', \'culaan.jadual\')))'),
            ]);
    }
};
