<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    protected $fillable = [
        'tajuk',
        'tempat',
        'tarikh',
        'masa',
        'group_id',
        'committee_group_filters',
        'group_pemilih_filters',
        'gambar',
        'has_laporan',
        'user_id',
    ];

    protected $casts = [
        'tarikh' => 'date:d-m-Y',
        'masa' => 'datetime:h:i A',
        'has_laporan' => 'boolean',
        'committee_group_filters' => 'array',
        'group_pemilih_filters' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(ProgramGroup::class, 'group_id');
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(ProgramAttendee::class)->latest();
    }

    public function sharedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'program_user_shares')
            ->withTimestamps();
    }

    public function subPrograms(): HasMany
    {
        return $this->hasMany(ProgramSubProgram::class);
    }
}
