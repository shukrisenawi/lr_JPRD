<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProgramAttendee extends Model
{
    protected $fillable = [
        'program_id',
        'user_id',
        'voter_id',
        'name',
        'no_kp',
        'old_ic',
        'no_ahli',
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
        'is_mesyuarat',
        'marked',
    ];

    protected $casts = [
        'attended_at' => 'datetime:d-m-Y h:i A',
        'is_mesyuarat' => 'boolean',
        'marked' => 'boolean',
    ];

    public function voter(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'voter_id', 'id');
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function subPrograms(): BelongsToMany
    {
        return $this->belongsToMany(ProgramSubProgram::class, 'attendee_sub_program');
    }
}
