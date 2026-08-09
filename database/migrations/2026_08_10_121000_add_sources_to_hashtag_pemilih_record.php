<?php

use App\Services\HashtagService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hashtag_pemilih_record', function (Blueprint $table) {
            $table->boolean('is_manual')->default(true);
            $table->boolean('is_program')->default(false);
        });

        DB::table('program_sub_programs')
            ->orderBy('id')
            ->each(function (object $subProgram) {
                $hashtag = HashtagService::normalizeTag((string) $subProgram->name);

                if ($hashtag === null) {
                    return;
                }

                $hashtagId = DB::table('hashtags')->where('name', $hashtag)->value('id');

                if ($hashtagId === null) {
                    return;
                }

                $voterIds = DB::table('attendee_sub_program')
                    ->join('program_attendees', 'program_attendees.id', '=', 'attendee_sub_program.program_attendee_id')
                    ->join('pemilih_records', 'pemilih_records.id', '=', 'program_attendees.voter_id')
                    ->where('attendee_sub_program.program_sub_program_id', $subProgram->id)
                    ->pluck('pemilih_records.id');

                DB::table('hashtag_pemilih_record')
                    ->where('hashtag_id', $hashtagId)
                    ->whereIn('pemilih_record_id', $voterIds)
                    ->update(['is_program' => true]);
            });
    }

    public function down(): void
    {
        Schema::table('hashtag_pemilih_record', function (Blueprint $table) {
            $table->dropColumn(['is_manual', 'is_program']);
        });
    }
};
