<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Clear existing data — start fresh
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('committee_memberships')->truncate();
        DB::table('committee_positions')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        Schema::table('committee_positions', function (Blueprint $table) {
            $table->foreignId('committee_group_id')->after('id')->constrained('committee_groups')->cascadeOnDelete();
            $table->string('level')->after('committee_group_id');

            $table->dropUnique('committee_positions_name_unique');
            $table->dropUnique('committee_positions_slug_unique');
        });

        DB::statement('CREATE UNIQUE INDEX committee_positions_group_level_name_unique ON committee_positions (committee_group_id, level, name)');
        DB::statement('CREATE INDEX committee_positions_group_level_index ON committee_positions (committee_group_id, level)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS committee_positions_group_level_name_unique');
        DB::statement('DROP INDEX IF EXISTS committee_positions_group_level_index');

        Schema::table('committee_positions', function (Blueprint $table) {
            $table->dropForeign(['committee_group_id']);
            $table->dropColumn(['committee_group_id', 'level']);

            $table->unique('name');
            $table->unique('slug');
        });
    }
};
