<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('voter_communications', function (Blueprint $table) {
            $table->string('status')->default('called')->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('voter_communications', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
