<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoterCommunication extends Model
{
    protected $fillable = [
        'voter_id',
        'user_id',
        'type',
        'notes',
    ];

    public function voter(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'voter_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
