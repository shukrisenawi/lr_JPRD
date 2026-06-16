<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UdmSnapshot extends Model
{
    protected $fillable = [
        'cutoff_day',
        'period_start',
        'period_end',
        'snapshot_date',
        'uploaded_by',
        'uploaded_at',
        'rows',
    ];

    protected function casts(): array
    {
        return [
            'cutoff_day' => 'integer',
            'period_start' => 'date',
            'period_end' => 'date',
            'snapshot_date' => 'date',
            'rows' => 'array',
        ];
    }
}
