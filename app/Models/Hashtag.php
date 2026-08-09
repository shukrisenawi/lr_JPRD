<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Hashtag extends Model
{
    protected $fillable = [
        'name',
    ];

    public function pemilihRecords(): BelongsToMany
    {
        return $this->belongsToMany(
            PemilihRecord::class,
            'hashtag_pemilih_record',
            'hashtag_id',
            'pemilih_record_id',
        );
    }
}
