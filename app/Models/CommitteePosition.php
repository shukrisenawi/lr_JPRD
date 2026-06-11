<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommitteePosition extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'sort_order',
        'level',
    ];

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(CommitteeGroup::class, 'committee_group_position')
            ->withPivot(['level', 'sort_order'])
            ->withTimestamps();
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(CommitteeMembership::class);
    }
}
