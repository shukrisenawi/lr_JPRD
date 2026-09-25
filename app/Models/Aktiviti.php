<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Aktiviti extends Model
{
    protected $table = 'aktiviti';

    protected $fillable = [
        'tajuk',
        'kategori',
        'tarikh',
        'masa',
        'tempat',
        'catatan',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'tarikh' => 'date:Y-m-d',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
