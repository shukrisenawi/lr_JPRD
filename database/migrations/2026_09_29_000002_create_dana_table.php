<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dana', function (Blueprint $table) {
            $table->id();
            $table->string('udm');
            $table->foreignId('kategori_id')->constrained('dana_kategori')->restrictOnDelete();
            $table->string('jenis_dana_lain')->nullable();
            $table->string('jenis', 10);
            $table->decimal('jumlah', 12, 2);
            $table->date('tarikh');
            $table->string('keterangan');
            $table->text('catatan')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['udm', 'tarikh']);
            $table->index(['kategori_id', 'jenis']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dana');
    }
};
