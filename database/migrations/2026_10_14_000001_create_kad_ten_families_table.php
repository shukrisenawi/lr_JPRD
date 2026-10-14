<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kad_ten_families', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('kad_ten_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pemilih_family_id')->unique()->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        // Peralihan kepada jagaan keluarga: kekalkan ketua, kosongkan tugasan individu.
        DB::table('kad_ten_members')->delete();
    }

    public function down(): void
    {
        Schema::dropIfExists('kad_ten_families');
    }
};
