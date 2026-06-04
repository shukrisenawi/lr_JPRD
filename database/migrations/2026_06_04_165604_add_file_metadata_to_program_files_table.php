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
        Schema::table('program_files', function (Blueprint $table) {
            $table->string('stored_path')->after('original_name');
            $table->string('file_type', 50)->nullable()->after('stored_path');
            $table->string('file_label', 255)->nullable()->after('file_type');
            $table->string('file_category', 50)->nullable()->after('file_label');
            $table->unsignedBigInteger('file_size')->nullable()->after('file_category');
        });
    }

    public function down(): void
    {
        Schema::table('program_files', function (Blueprint $table) {
            $table->dropColumn(['stored_path', 'file_type', 'file_label', 'file_category', 'file_size']);
        });
    }
};
