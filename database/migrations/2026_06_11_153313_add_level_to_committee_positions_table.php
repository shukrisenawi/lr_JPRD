<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('committee_positions', function (Blueprint $table) {
            $table->string('level', 20)->nullable()->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('committee_positions', function (Blueprint $table) {
            $table->dropColumn('level');
        });
    }
};
