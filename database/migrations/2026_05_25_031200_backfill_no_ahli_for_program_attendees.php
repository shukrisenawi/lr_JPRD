<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('
            UPDATE program_attendees pa
            JOIN pemilih_records pr ON (
                (pa.no_kp IS NOT NULL AND pa.no_kp != "" AND pr.no_kp = pa.no_kp)
                OR (pa.old_ic IS NOT NULL AND pa.old_ic != "" AND pr.old_ic = pa.old_ic)
            )
            SET pa.no_ahli = pr.no_ahli
            WHERE pa.no_ahli IS NULL AND pr.no_ahli IS NOT NULL
        ');
    }

    public function down(): void
    {
        // no rollback needed
    }
};
