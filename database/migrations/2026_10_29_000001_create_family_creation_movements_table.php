<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_creation_movements', function (Blueprint $table) {
            $table->id();
            // Keep creation history even if a family or its members are later removed.
            $table->unsignedBigInteger('family_id')->index();
            $table->string('dm')->default('')->index();
            $table->string('locality')->default('');
            $table->timestamp('created_at')->nullable();
        });

        DB::table('family_creation_movements')->insertUsing(
            ['family_id', 'dm', 'locality', 'created_at'],
            DB::table('pemilih_families as families')
                ->join('pemilih_family_members as members', 'members.pemilih_family_id', '=', 'families.id')
                ->join('pemilih_records as voters', 'voters.id', '=', 'members.pemilih_record_id')
                ->select('families.id')
                ->selectRaw("COALESCE(voters.dm, ''), COALESCE(voters.locality, ''), families.created_at")
                ->distinct(),
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('family_creation_movements');
    }
};
