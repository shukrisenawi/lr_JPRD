<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pemilih_baru_records', function (Blueprint $table) {
            $table->id();
            $table->char('record_key', 40)->unique();
            $table->string('import_month', 7)->index();
            $table->string('kod_par', 20)->nullable();
            $table->string('nama_par')->nullable();
            $table->string('kod_dun', 20)->nullable();
            $table->string('nama_dun')->nullable();
            $table->string('kod_dm', 20)->nullable();
            $table->string('dm')->nullable()->index();
            $table->string('kod_lokaliti', 20)->nullable();
            $table->string('locality')->nullable()->index();
            $table->string('transaction')->nullable();
            $table->string('no_kp', 40)->nullable()->index();
            $table->string('id_lain', 40)->nullable()->index();
            $table->string('gender', 20)->nullable();
            $table->unsignedSmallInteger('birth_year')->nullable();
            $table->string('name')->nullable()->index();
            $table->string('no_rumah')->nullable();
            $table->string('cula_code', 20)->nullable();
            $table->string('cula_display_label')->nullable();
            $table->text('catatan')->nullable();
            $table->text('alamat_kp')->nullable();
            $table->text('address')->nullable();
            $table->string('phone_home')->nullable();
            $table->string('phone_mobile')->nullable();
            $table->string('remark')->default('Belum link');
            $table->foreignId('linked_pemilih_record_id')
                ->nullable()
                ->constrained('pemilih_records')
                ->nullOnDelete();
            $table->timestamp('linked_at')->nullable();
            $table->string('source_file')->nullable();
            $table->string('imported_by')->nullable();
            $table->timestamps();

            $table->index(['import_month', 'cula_code']);
            $table->index(['import_month', 'remark']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pemilih_baru_records');
    }
};
