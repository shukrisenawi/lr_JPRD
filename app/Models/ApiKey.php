<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    protected $fillable = [
        'name',
        'key',
        'last_used_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'key' => 'encrypted',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }
}
