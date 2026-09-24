<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cawangans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('udm');
            $table->timestamps();

            $table->unique(['udm', 'name'], 'cawangans_udm_name_unique');
            $table->index('udm');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cawangans');
    }
};
