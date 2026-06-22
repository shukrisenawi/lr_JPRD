<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kad_tens', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->foreignId('pemimpin_id')->constrained('pemilih_records')->cascadeOnDelete();
            $table->string('level'); // jprd, udm, cawangan
            $table->string('scope_key')->nullable();
            $table->string('scope_name')->nullable();
            $table->string('parent_scope_name')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('level');
            $table->index('scope_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kad_tens');
    }
};
