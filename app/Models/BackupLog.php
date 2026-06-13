<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackupLog extends Model
{
    protected $fillable = [
        'user_name',
        'backed_up_at',
    ];

    protected $casts = [
        'backed_up_at' => 'datetime',
    ];
}
