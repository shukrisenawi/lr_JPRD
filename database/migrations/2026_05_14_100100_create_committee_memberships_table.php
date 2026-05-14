<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('committee_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pemilih_record_id')->constrained('pemilih_records')->cascadeOnDelete();
            $table->foreignId('committee_position_id')->constrained('committee_positions')->restrictOnDelete();
            $table->string('level');
            $table->string('scope_key');
            $table->string('scope_name');
            $table->string('parent_scope_name')->nullable();
            $table->timestamps();

            $table->unique(
                ['pemilih_record_id', 'committee_position_id', 'level', 'scope_key'],
                'committee_memberships_unique_assignment'
            );
            $table->index(['level', 'scope_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('committee_memberships');
    }
};
