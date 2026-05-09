<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_attendees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained()->cascadeOnDelete();
            $table->string('voter_id');
            $table->string('name');
            $table->string('no_kp')->nullable();
            $table->string('old_ic')->nullable();
            $table->string('phone_mobile')->nullable();
            $table->string('phone_home')->nullable();
            $table->string('dm')->nullable();
            $table->string('locality')->nullable();
            $table->string('gender')->nullable();
            $table->string('race')->nullable();
            $table->string('cula_code')->nullable();
            $table->string('cula_display_label')->nullable();
            $table->text('address')->nullable();
            $table->timestamp('attended_at')->nullable();
            $table->timestamps();
            $table->unique(['program_id', 'voter_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_attendees');
    }
};
