<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('committee_memberships', function (Blueprint $table) {
            $table->foreignId('committee_group_id')->nullable()->after('id')->constrained('committee_groups')->cascadeOnDelete();
        });

        if (DB::getDriverName() === 'sqlite') {
            DB::table('committee_memberships')->get()->each(function ($membership): void {
                $groups = DB::table('committee_group_position')
                    ->where('committee_position_id', $membership->committee_position_id)
                    ->where('level', $membership->level)
                    ->pluck('committee_group_id');

                if ($groups->count() === 1) {
                    DB::table('committee_memberships')
                        ->where('id', $membership->id)
                        ->update(['committee_group_id' => $groups->first()]);
                }
            });

            return;
        }

        DB::statement('
            UPDATE committee_memberships cm
            SET cm.committee_group_id = (
                SELECT cgp.committee_group_id
                FROM committee_group_position cgp
                WHERE cgp.committee_position_id = cm.committee_position_id
                  AND cgp.level = cm.level
                LIMIT 1
            )
            WHERE (
                SELECT COUNT(*)
                FROM committee_group_position cgp
                WHERE cgp.committee_position_id = cm.committee_position_id
                  AND cgp.level = cm.level
            ) = 1
        ');
    }

    public function down(): void
    {
        Schema::table('committee_memberships', function (Blueprint $table) {
            $table->dropForeign(['committee_group_id']);
            $table->dropColumn('committee_group_id');
        });
    }
};
