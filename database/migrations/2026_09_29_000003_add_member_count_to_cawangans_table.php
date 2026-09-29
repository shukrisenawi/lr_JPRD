<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cawangans', function (Blueprint $table) {
            $table->unsignedInteger('member_count')->default(0)->after('udm');
        });
    }

    public function down(): void
    {
        Schema::table('cawangans', function (Blueprint $table) {
            $table->dropColumn('member_count');
        });
    }
};
