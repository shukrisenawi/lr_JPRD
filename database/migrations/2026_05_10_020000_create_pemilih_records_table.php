<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pemilih_records', function (Blueprint $table) {
            $table->id();
            $table->string('identity_number')->unique();
            $table->string('no_kp')->nullable()->index();
            $table->string('old_ic')->nullable();
            $table->string('name')->nullable();
            $table->string('dm')->nullable();
            $table->string('locality')->nullable();
            $table->string('gender')->nullable();
            $table->string('race')->nullable();
            $table->string('cula_code')->nullable();
            $table->string('cula_display_label')->nullable();
            $table->text('address')->nullable();
            $table->string('phone_home')->nullable();
            $table->string('phone_mobile')->nullable();
            $table->string('status')->default('aktif')->index();
            $table->string('source_file')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pemilih_records');
    }
};
