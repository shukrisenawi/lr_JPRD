<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpokasMember extends Model
{
    protected $fillable = [
        'source_key',
        'source_page',
        'source_position',
        'source_record_id',
        'name',
        'member_number',
        'ic_birth',
        'ic_old',
        'status',
        'profile_url',
        'captured_at',
    ];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
        ];
    }
}
