<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')
            ->select(['id', 'access_modules'])
            ->orderBy('id')
            ->get()
            ->each(function (object $role): void {
                $modules = json_decode($role->access_modules ?? '[]', true);

                if (! is_array($modules) || ! in_array('culaan.senarai', $modules, true)
                    || in_array('culaan.pemilih-baharu', $modules, true)) {
                    return;
                }

                $modules[] = 'culaan.pemilih-baharu';

                DB::table('roles')
                    ->where('id', $role->id)
                    ->update(['access_modules' => json_encode(array_values(array_unique($modules)))]);
            });
    }

    public function down(): void
    {
        DB::table('roles')
            ->select(['id', 'access_modules'])
            ->orderBy('id')
            ->get()
            ->each(function (object $role): void {
                $modules = json_decode($role->access_modules ?? '[]', true);

                if (! is_array($modules) || ! in_array('culaan.pemilih-baharu', $modules, true)) {
                    return;
                }

                DB::table('roles')
                    ->where('id', $role->id)
                    ->update([
                        'access_modules' => json_encode(array_values(array_diff($modules, ['culaan.pemilih-baharu']))),
                    ]);
            });
    }
};
