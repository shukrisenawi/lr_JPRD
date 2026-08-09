<?php

use App\Services\HashtagService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('program_sub_programs')
            ->orderBy('id')
            ->each(function (object $subProgram) {
                $hashtag = HashtagService::normalizeTag((string) $subProgram->name);

                if ($hashtag === null || mb_strlen($hashtag) > 50) {
                    return;
                }

                DB::table('hashtags')->insertOrIgnore([
                    'name' => $hashtag,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $hashtagId = DB::table('hashtags')->where('name', $hashtag)->value('id');
                $voterIds = DB::table('attendee_sub_program')
                    ->join('program_attendees', 'program_attendees.id', '=', 'attendee_sub_program.program_attendee_id')
                    ->join('pemilih_records', 'pemilih_records.id', '=', 'program_attendees.voter_id')
                    ->where('attendee_sub_program.program_sub_program_id', $subProgram->id)
                    ->pluck('pemilih_records.id');

                foreach ($voterIds as $voterId) {
                    DB::table('hashtag_pemilih_record')->insertOrIgnore([
                        'hashtag_id' => $hashtagId,
                        'pemilih_record_id' => $voterId,
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Program hashtags share the central hashtag records and must not remove manual assignments.
    }
};
