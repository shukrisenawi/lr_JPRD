<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupPemilihKodCula extends Model
{
    protected $fillable = [
        'group_pemilih_id',
        'kod_cula',
    ];

    public function groupPemilih(): BelongsTo
    {
        return $this->belongsTo(GroupPemilih::class);
    }
}
