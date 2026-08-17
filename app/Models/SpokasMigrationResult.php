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
        'ic_old',
        'match_by',
        'pemilih_id',
        'pemilih_name',
        'pemilih_no_kp',
        'pemilih_old_ic',
        'previous_no_ahli',
        'reason',
        'remark',
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(SpokasMigrationRun::class, 'spokas_migration_run_id');
    }
}
