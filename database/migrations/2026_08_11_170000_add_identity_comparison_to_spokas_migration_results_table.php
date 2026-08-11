<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spokas_migration_results', function (Blueprint $table) {
            $table->string('ic_old', 64)->nullable()->after('ic_birth');
            $table->string('pemilih_old_ic')->nullable()->after('pemilih_no_kp');
        });
    }

    public function down(): void
    {
        Schema::table('spokas_migration_results', function (Blueprint $table) {
            $table->dropColumn(['ic_old', 'pemilih_old_ic']);
        });
    }
};
