<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pusat_khidmat_data', function (Blueprint $table) {
            $table->id();
            $table->string('sheet_key');
            $table->string('row_key')->unique();
            $table->string('row_fingerprint');
            $table->unsignedInteger('position');
            $table->string('no_kp')->nullable()->index();
            $table->foreignId('pemilih_record_id')->nullable()->constrained('pemilih_records')->nullOnDelete();
            $table->json('payload');
            $table->string('status')->default('aktif')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pusat_khidmat_data');
    }
};
