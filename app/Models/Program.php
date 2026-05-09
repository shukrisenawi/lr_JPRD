<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    protected $fillable = [
        'tajuk',
        'tempat',
        'tarikh',
        'masa',
        'gambar',
        'user_id',
    ];

    protected $casts = [
        'tarikh' => 'date',
        'masa' => 'datetime:H:i',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(ProgramAttendee::class)->latest();
    }
}
