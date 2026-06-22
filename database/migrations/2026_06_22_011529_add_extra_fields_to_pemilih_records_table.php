<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->string('no_rumah')->nullable()->after('identity_number');
            $table->string('no_siri')->nullable()->after('no_rumah');
            $table->text('catatan')->nullable()->after('cula_remark');
            $table->text('alamat_kp')->nullable()->after('catatan');
            $table->text('alamat_kediaman')->nullable()->after('alamat_kp');
        });
    }

    public function down(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->dropColumn(['no_rumah', 'no_siri', 'catatan', 'alamat_kp', 'alamat_kediaman']);
        });
    }
};
