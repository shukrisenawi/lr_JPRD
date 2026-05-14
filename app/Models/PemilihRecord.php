<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PemilihRecord extends Model
{
    protected $fillable = [
        'identity_number',
        'no_kp',
        'old_ic',
        'name',
        'dm',
        'locality',
        'gender',
        'race',
        'cula_code',
        'cula_display_label',
        'address',
        'phone_home',
        'phone_mobile',
        'status',
        'source_file',
    ];

    public function committeeMemberships(): HasMany
    {
        return $this->hasMany(CommitteeMembership::class, 'pemilih_record_id');
    }
}
