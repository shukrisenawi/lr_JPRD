<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->string('plk_verification_status', 32)->nullable()->after('plk_verified_by');
            $table->text('plk_verification_remark')->nullable()->after('plk_verification_status');
        });

        DB::table('pemilih_records')
            ->whereNotNull('plk_verified_at')
            ->update(['plk_verification_status' => 'maklumat_sah']);
    }

    public function down(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->dropColumn(['plk_verification_status', 'plk_verification_remark']);
        });
    }
};
