<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->index('name');
            $table->index('old_ic');
            $table->index('phone_home');
            $table->index('phone_mobile');
            $table->index('dm');
            $table->index('locality');
        });
    }

    public function down(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropIndex(['old_ic']);
            $table->dropIndex(['phone_home']);
            $table->dropIndex(['phone_mobile']);
            $table->dropIndex(['dm']);
            $table->dropIndex(['locality']);
        });
    }
};
