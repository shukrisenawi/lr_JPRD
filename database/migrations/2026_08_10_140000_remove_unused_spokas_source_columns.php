<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spokas_members', function (Blueprint $table) {
            $table->dropUnique('spokas_members_source_position_unique');
            $table->dropIndex('spokas_members_source_record_id_index');
            $table->dropColumn([
                'source_key',
                'source_page',
                'source_position',
                'source_record_id',
                'profile_url',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('spokas_members', function (Blueprint $table) {
            $table->string('source_key', 100)->nullable();
            $table->unsignedInteger('source_page')->nullable();
            $table->unsignedInteger('source_position')->nullable();
            $table->string('source_record_id', 64)->nullable();
            $table->text('profile_url')->nullable();

            $table->unique(
                ['source_key', 'source_page', 'source_position'],
                'spokas_members_source_position_unique'
            );
            $table->index('source_record_id');
        });
    }
};
