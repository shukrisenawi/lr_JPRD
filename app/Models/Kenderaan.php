<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kenderaan extends Model
{
    protected $table = 'kenderaan';

    protected $fillable = [
        'udm',
        'no_plate',
        'jenis_kenderaan',
        'nama_pemandu',
        'no_tel',
        'lokaliti',
    ];
}
