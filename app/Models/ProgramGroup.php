<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProgramGroup extends Model
{
    protected $fillable = [
        'name',
        'user_id',
        'default_laporan',
        'default_mesyuarat',
        'default_committee_group',
        'default_group_pemilih_filters',
    ];

    protected function casts(): array
    {
        return [
            'default_laporan' => 'boolean',
            'default_mesyuarat' => 'boolean',
            'default_group_pemilih_filters' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function programs(): HasMany
    {
        return $this->hasMany(Program::class, 'group_id');
    }
}
