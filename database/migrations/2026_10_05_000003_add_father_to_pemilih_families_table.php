<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pemilih_families', function (Blueprint $table) {
            $table->foreignId('father_pemilih_record_id')
                ->nullable()
                ->constrained('pemilih_records')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pemilih_families', function (Blueprint $table) {
            $table->dropForeign(['father_pemilih_record_id']);
            $table->dropColumn('father_pemilih_record_id');
        });
    }
};
