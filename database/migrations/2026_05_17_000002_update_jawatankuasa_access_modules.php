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

        if (DB::getDriverName() === 'sqlite') {
            DB::table('roles')->get()->each(function ($role) use ($childKeys): void {
                $modules = json_decode($role->access_modules ?? '[]', true) ?: [];

                if (in_array('jawatankuasa', $modules, true)) {
                    DB::table('roles')->where('id', $role->id)->update([
                        'access_modules' => json_encode($childKeys),
                    ]);
                }
            });

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
        if (DB::getDriverName() === 'sqlite') {
            DB::table('roles')->get()->each(function ($role): void {
                $modules = json_decode($role->access_modules ?? '[]', true) ?: [];

                if (array_intersect(['jawatankuasa.senarai', 'jawatankuasa.jawatan'], $modules)) {
                    DB::table('roles')->where('id', $role->id)->update([
                        'access_modules' => json_encode(['jawatankuasa']),
                    ]);
                }
            });

            return;
        }

        DB::statement("
            UPDATE roles
            SET access_modules = JSON_ARRAY('jawatankuasa')
            WHERE JSON_CONTAINS(access_modules, '\"jawatankuasa.senarai\"')
               OR JSON_CONTAINS(access_modules, '\"jawatankuasa.jawatan\"')
        ");
    }
};
