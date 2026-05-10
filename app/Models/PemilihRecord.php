<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
}
