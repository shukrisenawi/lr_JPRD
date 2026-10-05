<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pemilih_families', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('pemilih_family_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pemilih_family_id')->constrained('pemilih_families')->cascadeOnDelete();
            $table->foreignId('pemilih_record_id')->unique()->constrained('pemilih_records')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('pemilih_family_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pemilih_family_members');
        Schema::dropIfExists('pemilih_families');
    }
};
