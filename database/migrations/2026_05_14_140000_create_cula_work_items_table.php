<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cula_work_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pemilih_record_id')->constrained('pemilih_records')->cascadeOnDelete();
            $table->foreignId('marked_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('marked_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique('pemilih_record_id');
            $table->index('marked_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cula_work_items');
    }
};
