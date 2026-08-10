<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpokasMember extends Model
{
    protected $fillable = [
        'name',
        'member_number',
        'ic_birth',
        'ic_old',
        'status',
        'captured_at',
    ];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
        ];
    }
}
