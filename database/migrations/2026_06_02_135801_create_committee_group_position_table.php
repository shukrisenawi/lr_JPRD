<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('committee_group_position', function (Blueprint $table) {
            $table->id();
            $table->foreignId('committee_group_id')->constrained('committee_groups')->cascadeOnDelete();
            $table->foreignId('committee_position_id')->constrained('committee_positions')->cascadeOnDelete();
            $table->string('level');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['committee_group_id', 'committee_position_id', 'level'], 'cgp_unique');
            $table->index(['committee_group_id', 'level'], 'cgp_group_level_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('committee_group_position');
    }
};
