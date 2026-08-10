<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpokasMigrationResult extends Model
{
    protected $fillable = [
        'spokas_migration_run_id',
        'category',
        'spokas_member_id',
        'name',
        'member_number',
        'ic_birth',
        'match_by',
        'pemilih_id',
        'pemilih_name',
        'pemilih_no_kp',
        'previous_no_ahli',
        'reason',
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(SpokasMigrationRun::class, 'spokas_migration_run_id');
    }
}
