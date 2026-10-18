<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pemilih_baru_records', function (Blueprint $table) {
            $table->timestamp('telegram_cula_confirmed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('pemilih_baru_records', function (Blueprint $table) {
            $table->dropColumn('telegram_cula_confirmed_at');
        });
    }
};
