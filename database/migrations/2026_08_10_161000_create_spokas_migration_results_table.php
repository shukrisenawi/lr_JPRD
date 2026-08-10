<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spokas_migration_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spokas_migration_run_id')->constrained()->cascadeOnDelete();
            $table->string('category', 20);
            $table->unsignedBigInteger('spokas_member_id')->nullable();
            $table->string('name')->nullable();
            $table->string('member_number', 64)->nullable();
            $table->string('ic_birth', 32)->nullable();
            $table->string('match_by', 20)->nullable();
            $table->unsignedBigInteger('pemilih_id')->nullable();
            $table->string('pemilih_name')->nullable();
            $table->string('pemilih_no_kp')->nullable();
            $table->string('previous_no_ahli')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index(['spokas_migration_run_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spokas_migration_results');
    }
};
