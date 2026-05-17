<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_pemilihs', function (Blueprint $table) {
            $table->id();
            $table->string('nama_group');
            $table->string('keturunan')->nullable();
            $table->string('jantina')->nullable();
            $table->integer('umur_dari')->nullable();
            $table->integer('umur_akhir')->nullable();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_pemilihs');
    }
};
