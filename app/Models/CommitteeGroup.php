<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CommitteeGroup extends Model
{
    protected $fillable = [
        'name',
        'levels',
        'sort_order',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'levels' => 'array',
        ];
    }

    public function positions(): BelongsToMany
    {
        return $this->belongsToMany(CommitteePosition::class, 'committee_group_position')
            ->withPivot(['level', 'sort_order'])
            ->withTimestamps();
    }
}
