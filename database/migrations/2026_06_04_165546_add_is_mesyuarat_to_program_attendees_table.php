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
            $table->boolean('is_mesyuarat')->default(false)->after('attended_at');
            $table->boolean('marked')->default(false)->after('is_mesyuarat');
        });
    }

    public function down(): void
    {
        Schema::table('program_attendees', function (Blueprint $table) {
            $table->dropColumn(['is_mesyuarat', 'marked']);
        });
    }
};
