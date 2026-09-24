<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('committee_memberships', function (Blueprint $table) {
            $table->foreignId('cawangan_id')
                ->nullable()
                ->after('committee_group_id')
                ->constrained('cawangans')
                ->nullOnDelete();
            $table->index('cawangan_id');
        });
    }

    public function down(): void
    {
        Schema::table('committee_memberships', function (Blueprint $table) {
            $table->dropForeign(['cawangan_id']);
            $table->dropIndex(['cawangan_id']);
            $table->dropColumn('cawangan_id');
        });
    }
};
