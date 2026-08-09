<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pusat_khidmat_data', function (Blueprint $table) {
            $table->boolean('is_manual')->default(false)->after('status')->index();
        });
    }

    public function down(): void
    {
        Schema::table('pusat_khidmat_data', function (Blueprint $table) {
            $table->dropIndex(['is_manual']);
            $table->dropColumn('is_manual');
        });
    }
};
