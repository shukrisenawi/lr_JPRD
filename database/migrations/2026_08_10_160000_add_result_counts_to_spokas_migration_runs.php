<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spokas_migration_runs', function (Blueprint $table) {
            $table->unsignedInteger('ic_match_count')->default(0)->after('updated_count');
            $table->unsignedInteger('name_match_count')->default(0)->after('ic_match_count');
            $table->unsignedInteger('failed_count')->default(0)->after('name_match_count');
        });
    }

    public function down(): void
    {
        Schema::table('spokas_migration_runs', function (Blueprint $table) {
            $table->dropColumn(['ic_match_count', 'name_match_count', 'failed_count']);
        });
    }
};
