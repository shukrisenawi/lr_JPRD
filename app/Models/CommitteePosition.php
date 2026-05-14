<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommitteePosition extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'sort_order',
    ];

    public function memberships(): HasMany
    {
        return $this->hasMany(CommitteeMembership::class);
    }
}
