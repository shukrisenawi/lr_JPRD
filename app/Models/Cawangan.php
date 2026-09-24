<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cawangan extends Model
{
    protected $fillable = [
        'name',
        'udm',
    ];

    public function committeeMemberships(): HasMany
    {
        return $this->hasMany(CommitteeMembership::class);
    }
}
