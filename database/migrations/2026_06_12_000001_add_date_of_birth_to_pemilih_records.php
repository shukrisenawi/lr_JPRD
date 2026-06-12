<?php

use App\Models\PemilihRecord;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('no_kp');
        });

        $this->backfillDateOfBirth();
    }

    private function backfillDateOfBirth(): void
    {
        PemilihRecord::query()
            ->whereNotNull('no_kp')
            ->where('no_kp', '!=', '')
            ->whereRaw('LENGTH(no_kp) >= 6')
            ->whereNull('date_of_birth')
            ->chunk(200, function ($voters) {
                foreach ($voters as $voter) {
                    $dob = $this->parseDobFromNoKp($voter->no_kp);
                    if ($dob) {
                        PemilihRecord::withoutTimestamps(fn () => $voter->update(['date_of_birth' => $dob]));
                    }
                }
            });
    }

    private function parseDobFromNoKp(string $noKp): ?string
    {
        $digits = preg_replace('/\D+/', '', $noKp);

        if (strlen($digits) < 6) {
            return null;
        }

        $yy = (int) substr($digits, 0, 2);
        $mm = (int) substr($digits, 2, 2);
        $dd = (int) substr($digits, 4, 2);

        if ($mm < 1 || $mm > 12 || $dd < 1 || $dd > 31) {
            return null;
        }

        $currentYear = (int) now()->format('y');
        $century = $yy > $currentYear ? 1900 : 2000;
        $year = $century + $yy;

        if (! checkdate($mm, $dd, $year)) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $year, $mm, $dd);
    }

    public function down(): void
    {
        Schema::table('pemilih_records', function (Blueprint $table) {
            $table->dropColumn('date_of_birth');
        });
    }
};
