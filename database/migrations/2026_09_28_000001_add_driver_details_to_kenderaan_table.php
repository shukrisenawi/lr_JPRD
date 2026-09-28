<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kenderaan', function (Blueprint $table) {
            $table->string('nama_pemandu')->nullable()->after('jenis_kenderaan');
            $table->string('no_tel', 30)->nullable()->after('nama_pemandu');
            $table->string('lokaliti')->nullable()->after('no_tel');
        });
    }

    public function down(): void
    {
        Schema::table('kenderaan', function (Blueprint $table) {
            $table->dropColumn(['nama_pemandu', 'no_tel', 'lokaliti']);
        });
    }
};
