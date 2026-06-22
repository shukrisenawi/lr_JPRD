<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kad_ten_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kad_ten_id')->constrained('kad_tens')->cascadeOnDelete();
            $table->foreignId('pemilih_record_id')->constrained('pemilih_records')->cascadeOnDelete();
            $table->string('cluster_type')->nullable(); // alamat, no_rumah, manual
            $table->string('cluster_value')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['kad_ten_id', 'pemilih_record_id']);
            $table->index('pemilih_record_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kad_ten_members');
    }
};
