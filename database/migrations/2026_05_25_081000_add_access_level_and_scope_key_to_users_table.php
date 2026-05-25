<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('access_level')->default('jprd')->after('role_id');
            $table->string('scope_key')->nullable()->after('access_level');
            $table->index(['access_level', 'scope_key']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['access_level', 'scope_key']);
            $table->dropColumn(['access_level', 'scope_key']);
        });
    }
};
