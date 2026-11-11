<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('poster_path')->nullable();
            $table->string('audience');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        foreach (['role', 'user'] as $target) {
            Schema::create('announcement_'.$target, function (Blueprint $table) use ($target) {
                $table->foreignId('announcement_id')->constrained()->cascadeOnDelete();
                $table->foreignId($target.'_id')->constrained()->cascadeOnDelete();
                $table->primary(['announcement_id', $target.'_id']);
            });
        }
        Schema::create('announcement_dismissals', function (Blueprint $table) {
            $table->foreignId('announcement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['announcement_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_dismissals');
        Schema::dropIfExists('announcement_user');
        Schema::dropIfExists('announcement_role');
        Schema::dropIfExists('announcements');
    }
};
