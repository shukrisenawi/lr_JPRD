<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramAttendee extends Model
{
    protected $fillable = [
        'program_id',
        'voter_id',
        'name',
        'no_kp',
        'old_ic',
        'phone_mobile',
        'phone_home',
        'dm',
        'locality',
        'gender',
        'race',
        'cula_code',
        'cula_display_label',
        'address',
        'attended_at',
    ];

    protected $casts = [
        'attended_at' => 'datetime',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
