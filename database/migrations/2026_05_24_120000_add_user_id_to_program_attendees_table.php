<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('program_attendees', 'user_id')) {
            Schema::table('program_attendees', function (Blueprint $table) {
                $table->foreignId('user_id')
                    ->nullable()
                    ->after('program_id')
                    ->constrained()
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('program_attendees', 'user_id')) {
            Schema::table('program_attendees', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }
    }
};
