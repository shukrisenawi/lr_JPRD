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
        Schema::create('sheet_pages', function (Blueprint $table) {
            $table->id();
            $table->string('sheet_key');
            $table->unsignedInteger('page_number');
            $table->json('headers')->nullable();
            $table->unsignedInteger('source_total_rows')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['sheet_key', 'page_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sheet_pages');
    }
};
