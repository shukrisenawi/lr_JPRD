<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CulaWorkItem extends Model
{
    protected $fillable = [
        'pemilih_record_id',
        'marked_by',
        'marked_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'marked_at' => 'datetime',
        ];
    }

    public function voter(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'pemilih_record_id');
    }

    public function marker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by');
    }
}
