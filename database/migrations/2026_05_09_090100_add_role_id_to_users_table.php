<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('avatar')->constrained()->nullOnDelete();
        });

        $masterAdminRoleId = DB::table('roles')
            ->where('slug', 'master-admin')
            ->value('id');

        if ($masterAdminRoleId !== null) {
            DB::table('users')
                ->whereNull('role_id')
                ->update(['role_id' => $masterAdminRoleId]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });
    }
};
