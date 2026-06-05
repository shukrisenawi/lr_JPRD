<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('program_groups', function (Blueprint $table) {
            $table->json('default_shared_user_ids')->nullable()->after('default_group_pemilih_filters');
        });
    }

    public function down(): void
    {
        Schema::table('program_groups', function (Blueprint $table) {
            $table->dropColumn('default_shared_user_ids');
        });
    }
};
