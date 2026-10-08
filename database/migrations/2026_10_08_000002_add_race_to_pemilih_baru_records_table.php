<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pemilih_baru_records', function (Blueprint $table) {
            $table->string('race')->nullable()->after('gender');
        });
    }

    public function down(): void
    {
        Schema::table('pemilih_baru_records', function (Blueprint $table) {
            $table->dropColumn('race');
        });
    }
};
