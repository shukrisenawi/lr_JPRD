<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProgramSubProgram extends Model
{
    protected $fillable = [
        'program_id',
        'name',
        'color',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function attendees(): BelongsToMany
    {
        return $this->belongsToMany(ProgramAttendee::class, 'attendee_sub_program');
    }
}
