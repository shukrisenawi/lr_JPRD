<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PusatKhidmatData extends Model
{
    protected $table = 'pusat_khidmat_data';

    protected $fillable = [
        'sheet_key',
        'row_key',
        'row_fingerprint',
        'position',
        'no_kp',
        'pemilih_record_id',
        'payload',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function pemilihRecord(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'pemilih_record_id');
    }
}
