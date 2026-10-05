<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->timestamp('plk_verified_at')->nullable()->after('cula_display_label');
            $table->foreignId('plk_verified_by')->nullable()->after('plk_verified_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->dropForeign(['plk_verified_by']);
            $table->dropColumn(['plk_verified_at', 'plk_verified_by']);
        });
    }
};
