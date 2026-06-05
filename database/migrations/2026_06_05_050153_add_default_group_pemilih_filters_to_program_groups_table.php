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
        Schema::table('program_groups', function (Blueprint $table) {
            $table->json('default_group_pemilih_filters')->nullable()->after('default_committee_group');
        });
    }

    public function down(): void
    {
        Schema::table('program_groups', function (Blueprint $table) {
            $table->dropColumn('default_group_pemilih_filters');
        });
    }
};
