<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->boolean('is_master_admin')->default(false);
            $table->json('access_modules')->nullable();
            $table->timestamps();
        });

        DB::table('roles')->insert([
            'name' => 'Master Admin',
            'slug' => 'master-admin',
            'is_master_admin' => true,
            'access_modules' => json_encode(array_keys(config('admin-modules', []))),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
