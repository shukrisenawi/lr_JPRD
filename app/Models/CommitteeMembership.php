<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommitteeMembership extends Model
{
    protected $fillable = [
        'committee_group_id',
        'pemilih_record_id',
        'committee_position_id',
        'level',
        'scope_key',
        'scope_name',
        'parent_scope_name',
        'created_by',
        'notes',
    ];

    public function voter(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'pemilih_record_id');
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(CommitteePosition::class, 'committee_position_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
