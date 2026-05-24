<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('pemilih_records', 'is_manual')) {
            Schema::table('pemilih_records', function (Blueprint $table) {
                $table->boolean('is_manual')->default(false)->after('source_file');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pemilih_records', 'is_manual')) {
            Schema::table('pemilih_records', function (Blueprint $table) {
                $table->dropColumn('is_manual');
            });
        }
    }
};
