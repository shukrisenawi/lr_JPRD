<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('udm_snapshots', function (Blueprint $table) {
            $table->id();
            $table->integer('cutoff_day');
            $table->date('period_start');
            $table->date('period_end');
            $table->date('snapshot_date');
            $table->string('uploaded_by')->nullable();
            $table->timestamp('uploaded_at')->nullable();
            $table->json('rows');
            $table->timestamps();

            $table->index(['cutoff_day', 'period_start', 'period_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('udm_snapshots');
    }
};
