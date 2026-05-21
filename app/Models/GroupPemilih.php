<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GroupPemilih extends Model
{
    protected $fillable = [
        'nama_group',
        'keturunan',
        'jantina',
        'umur_dari',
        'umur_akhir',
        'sort_order',
        'show_in_culaan_report',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function kodCulas(): HasMany
    {
        return $this->hasMany(GroupPemilihKodCula::class);
    }
}
