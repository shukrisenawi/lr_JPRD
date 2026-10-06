<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PemilihFamily extends Model
{
    protected $fillable = [
        'name',
        'created_by',
        'father_pemilih_record_id',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function father(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'father_pemilih_record_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(
            PemilihRecord::class,
            'pemilih_family_members',
            'pemilih_family_id',
            'pemilih_record_id',
        )->withPivot(['created_by', 'auto_added_by_father_id'])->withTimestamps()->orderBy('pemilih_records.name');
    }
}
