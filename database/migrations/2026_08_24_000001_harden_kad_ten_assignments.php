<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicateLeaders = DB::table('kad_tens')
            ->select('pemimpin_id')
            ->groupBy('pemimpin_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('pemimpin_id');

        if ($duplicateLeaders->isNotEmpty()) {
            throw new RuntimeException(
                'Migration Kad 10 dihentikan: ketua mempunyai lebih daripada satu kad (ID pemilih: '
                .$duplicateLeaders->implode(', ').'). Selesaikan pendua dahulu.'
            );
        }

        $duplicateMembers = DB::table('kad_ten_members')
            ->select('pemilih_record_id')
            ->groupBy('pemilih_record_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('pemilih_record_id');

        if ($duplicateMembers->isNotEmpty()) {
            throw new RuntimeException(
                'Migration Kad 10 dihentikan: pemilih berada dalam lebih daripada satu kad (ID pemilih: '
                .$duplicateMembers->implode(', ').'). Selesaikan pendua dahulu.'
            );
        }

        Schema::table('kad_tens', function (Blueprint $table): void {
            $table->foreignId('committee_membership_id')
                ->nullable()
                ->after('pemimpin_id')
                ->constrained('committee_memberships')
                ->nullOnDelete();
        });

        DB::table('kad_tens')
            ->orderBy('id')
            ->get()
            ->each(function (object $kad): void {
                $membership = DB::table('committee_memberships')
                    ->where('pemilih_record_id', $kad->pemimpin_id)
                    ->where('level', $kad->level)
                    ->where('scope_key', $kad->scope_key)
                    ->orderBy('id')
                    ->first();

                if ($membership) {
                    DB::table('kad_tens')
                        ->where('id', $kad->id)
                        ->update(['committee_membership_id' => $membership->id]);
                }
            });

        Schema::table('kad_tens', function (Blueprint $table): void {
            $table->unique('pemimpin_id', 'kad_tens_pemimpin_id_unique');
        });

        Schema::table('kad_ten_members', function (Blueprint $table): void {
            $table->unsignedSmallInteger('match_score')->nullable()->after('cluster_value');
            $table->string('match_reason')->nullable()->after('match_score');
            $table->unique('pemilih_record_id', 'kad_ten_members_pemilih_record_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('kad_ten_members', function (Blueprint $table): void {
            $table->dropUnique('kad_ten_members_pemilih_record_id_unique');
            $table->dropColumn(['match_score', 'match_reason']);
        });

        Schema::table('kad_tens', function (Blueprint $table): void {
            $table->dropUnique('kad_tens_pemimpin_id_unique');
            $table->dropForeign(['committee_membership_id']);
            $table->dropColumn('committee_membership_id');
        });
    }
};
