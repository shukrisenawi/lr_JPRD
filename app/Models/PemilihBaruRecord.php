<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PemilihBaruRecord extends Model
{
    protected $fillable = [
        'record_key',
        'import_month',
        'kod_par',
        'nama_par',
        'kod_dun',
        'nama_dun',
        'kod_dm',
        'dm',
        'kod_lokaliti',
        'locality',
        'transaction',
        'no_kp',
        'id_lain',
        'gender',
        'race',
        'birth_year',
        'name',
        'no_rumah',
        'cula_code',
        'cula_display_label',
        'catatan',
        'alamat_kp',
        'address',
        'phone_home',
        'phone_mobile',
        'remark',
        'linked_pemilih_record_id',
        'linked_at',
        'source_file',
        'imported_by',
    ];

    protected function casts(): array
    {
        return [
            'birth_year' => 'integer',
            'linked_at' => 'datetime',
        ];
    }

    public function linkedPemilih(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'linked_pemilih_record_id');
    }
}
