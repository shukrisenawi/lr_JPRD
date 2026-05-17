<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_pemilih_kod_culas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_pemilih_id')->constrained('group_pemilihs')->cascadeOnDelete();
            $table->string('kod_cula');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_pemilih_kod_culas');
    }
};
