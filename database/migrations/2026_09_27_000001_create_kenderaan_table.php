<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kenderaan', function (Blueprint $table) {
            $table->id();
            $table->string('udm');
            $table->string('no_plate', 30)->unique();
            $table->string('jenis_kenderaan', 100);
            $table->timestamps();

            $table->index('udm');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kenderaan');
    }
};
