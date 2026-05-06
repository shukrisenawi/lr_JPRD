<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sheet_page_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sheet_page_id')->constrained('sheet_pages')->cascadeOnDelete();
            $table->string('sheet_key');
            $table->string('row_key');
            $table->string('row_fingerprint');
            $table->unsignedInteger('position');
            $table->json('payload');
            $table->string('no_kp')->nullable();
            $table->timestamps();

            $table->unique(['sheet_key', 'row_fingerprint']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sheet_page_rows');
    }
};
