<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pusat_khidmat_data', function (Blueprint $table) {
            $table->foreignId('checked_by')
                ->nullable()
                ->after('checked_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pusat_khidmat_data', function (Blueprint $table) {
            $table->dropForeign(['checked_by']);
            $table->dropColumn('checked_by');
        });
    }
};
