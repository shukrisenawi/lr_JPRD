<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpokasMigrationRun extends Model
{
    protected $fillable = [
        'user_id',
        'source_count',
        'updated_count',
        'ic_matches',
        'name_matches',
        'failed',
        'executed_at',
    ];

    protected function casts(): array
    {
        return [
            'ic_matches' => 'array',
            'name_matches' => 'array',
            'failed' => 'array',
            'executed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resultPayload(): array
    {
        return [
            'source_count' => (int) $this->source_count,
            'updated_count' => (int) $this->updated_count,
            'ic_matches' => $this->ic_matches ?? [],
            'name_matches' => $this->name_matches ?? [],
            'failed' => $this->failed ?? [],
        ];
    }
}
