<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KadTenMember extends Model
{
    protected $fillable = [
        'kad_ten_id',
        'pemilih_record_id',
        'cluster_type',
        'cluster_value',
        'created_by',
    ];

    public function kadTen(): BelongsTo
    {
        return $this->belongsTo(KadTen::class, 'kad_ten_id');
    }

    public function voter(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'pemilih_record_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
