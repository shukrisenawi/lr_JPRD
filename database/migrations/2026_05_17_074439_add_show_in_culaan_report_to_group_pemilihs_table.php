<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_pemilihs', function (Blueprint $table) {
            $table->boolean('show_in_culaan_report')->default(false)->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('group_pemilihs', function (Blueprint $table) {
            $table->dropColumn('show_in_culaan_report');
        });
    }
};
