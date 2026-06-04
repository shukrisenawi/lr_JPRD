<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->dropForeign(['committee_group_id']);
            $table->dropColumn(['committee_group_id', 'committee_group_level']);
            $table->json('committee_group_filters')->nullable()->after('group_id');
        });
    }

    public function down(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->dropColumn('committee_group_filters');
            $table->foreignId('committee_group_id')
                ->nullable()
                ->constrained('committee_groups')
                ->nullOnDelete();
            $table->string('committee_group_level')->nullable();
        });
    }
};
