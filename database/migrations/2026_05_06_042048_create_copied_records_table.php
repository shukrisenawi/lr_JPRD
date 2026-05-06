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
        Schema::create('copied_records', function (Blueprint $table) {
            $table->id();
            $table->string('sheet_key');
            $table->string('row_key');
            $table->string('no_kp')->nullable();
            $table->timestamp('copied_at')->nullable();
            $table->timestamps();

            $table->unique(['sheet_key', 'row_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('copied_records');
    }
};
