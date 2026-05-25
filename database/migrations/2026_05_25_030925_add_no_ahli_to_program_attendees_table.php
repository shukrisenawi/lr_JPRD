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
        Schema::table('program_attendees', function (Blueprint $table) {
            $table->string('no_ahli')->nullable()->after('old_ic');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('program_attendees', function (Blueprint $table) {
            $table->dropColumn('no_ahli');
        });
    }
};
