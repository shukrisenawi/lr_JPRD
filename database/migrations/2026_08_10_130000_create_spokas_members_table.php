<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spokas_members', function (Blueprint $table) {
            $table->id();
            $table->string('source_key', 100);
            $table->unsignedInteger('source_page');
            $table->unsignedInteger('source_position');
            $table->string('source_record_id', 64)->nullable();
            $table->string('name')->nullable();
            $table->string('member_number', 64)->nullable();
            $table->string('ic_birth', 32)->nullable();
            $table->string('ic_old', 64)->nullable();
            $table->string('status', 80)->nullable();
            $table->text('profile_url')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['source_key', 'source_page', 'source_position'],
                'spokas_members_source_position_unique'
            );
            $table->index('source_record_id');
            $table->index('member_number');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spokas_members');
    }
};
