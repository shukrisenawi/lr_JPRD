<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hashtags', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->timestamps();
        });

        Schema::create('hashtag_pemilih_record', function (Blueprint $table) {
            $table->foreignId('hashtag_id')->constrained('hashtags')->cascadeOnDelete();
            $table->foreignId('pemilih_record_id')->constrained('pemilih_records')->cascadeOnDelete();
            $table->unique(['hashtag_id', 'pemilih_record_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hashtag_pemilih_record');
        Schema::dropIfExists('hashtags');
    }
};
