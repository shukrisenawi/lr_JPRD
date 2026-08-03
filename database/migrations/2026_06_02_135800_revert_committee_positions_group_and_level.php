<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        Schema::table('committee_positions', function (Blueprint $table) {
            $table->dropForeign(['committee_group_id']);

            $indexes = collect(DB::select('SHOW INDEXES FROM committee_positions'))
                ->pluck('Key_name')
                ->unique()
                ->all();

            if (in_array('committee_positions_group_level_name_unique', $indexes)) {
                $table->dropUnique('committee_positions_group_level_name_unique');
            }
            if (in_array('committee_positions_group_level_index', $indexes)) {
                $table->dropIndex('committee_positions_group_level_index');
            }

            $table->dropColumn(['committee_group_id', 'level']);
        });

        Schema::table('committee_positions', function (Blueprint $table) {
            $table->string('name')->unique()->change();
            $table->string('slug')->unique()->change();
        });

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        Schema::table('committee_positions', function (Blueprint $table) {
            $table->dropUnique('committee_positions_name_unique');
            $table->dropUnique('committee_positions_slug_unique');

            $table->foreignId('committee_group_id')->after('id')->constrained('committee_groups')->cascadeOnDelete();
            $table->string('level')->after('committee_group_id');

            $table->unique(['committee_group_id', 'level', 'name'], 'committee_positions_group_level_name_unique');
            $table->index(['committee_group_id', 'level'], 'committee_positions_group_level_index');
        });

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
};
