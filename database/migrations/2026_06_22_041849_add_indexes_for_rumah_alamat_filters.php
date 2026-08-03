<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->index(['no_rumah', 'locality'], 'idx_no_rumah_locality');
        });

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('pemilih_records', function (Blueprint $table) {
                $table->index('address', 'idx_address');
            });

            return;
        }

        DB::statement('ALTER TABLE pemilih_records ADD INDEX idx_address (address(255))');
    }

    public function down(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->dropIndex('idx_no_rumah_locality');
        });

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('pemilih_records', function (Blueprint $table) {
                $table->dropIndex('idx_address');
            });

            return;
        }

        DB::statement('ALTER TABLE pemilih_records DROP INDEX idx_address');
    }
};
