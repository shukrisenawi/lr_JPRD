<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CopiedRecord extends Model
{
    protected $fillable = [
        'sheet_key',
        'row_key',
        'no_kp',
        'copied_at',
    ];

    protected $casts = [
        'copied_at' => 'datetime',
    ];
}
