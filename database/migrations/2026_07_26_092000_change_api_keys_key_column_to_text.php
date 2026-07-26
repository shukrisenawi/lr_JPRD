<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Padam semua data sedia ada kerana key telah disimpan
        // menggunakan format hashed (SHA256) dan kini ditukar ke
        // encrypted cast — data lama tidak boleh didecrypt.
        DB::table('api_keys')->truncate();

        Schema::table('api_keys', function (Blueprint $table) {
            $table->text('key')->change();
        });
    }

    public function down(): void
    {
        Schema::table('api_keys', function (Blueprint $table) {
            $table->string('key', 64)->change();
        });
    }
};
