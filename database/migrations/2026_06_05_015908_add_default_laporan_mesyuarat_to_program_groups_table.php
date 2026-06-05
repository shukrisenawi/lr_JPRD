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
            $table->boolean('default_laporan')->default(false)->after('name');
            $table->boolean('default_mesyuarat')->default(false)->after('default_laporan');
        });
    }

    public function down(): void
    {
        Schema::table('program_groups', function (Blueprint $table) {
            $table->dropColumn(['default_laporan', 'default_mesyuarat']);
        });
    }
};
