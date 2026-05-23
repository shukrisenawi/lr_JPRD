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
        Schema::create('attendee_sub_program', function (Blueprint $table) {
            $table->foreignId('program_attendee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('program_sub_program_id')->constrained()->cascadeOnDelete();
            $table->primary(['program_attendee_id', 'program_sub_program_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendee_sub_program');
    }
};
