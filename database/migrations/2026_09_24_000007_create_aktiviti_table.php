<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aktiviti', function (Blueprint $table) {
            $table->id();
            $table->string('tajuk');
            $table->string('kategori')->nullable();
            $table->date('tarikh');
            $table->time('masa');
            $table->string('tempat')->nullable();
            $table->text('catatan')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['tarikh', 'masa']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aktiviti');
    }
};
