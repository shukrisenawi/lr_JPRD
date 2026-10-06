<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pemilih_family_members', function (Blueprint $table) {
            $table->foreignId('auto_added_by_father_id')
                ->nullable()
                ->constrained('pemilih_records')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pemilih_family_members', function (Blueprint $table) {
            $table->dropForeign(['auto_added_by_father_id']);
            $table->dropColumn('auto_added_by_father_id');
        });
    }
};
