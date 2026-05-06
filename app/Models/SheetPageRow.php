<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SheetPageRow extends Model
{
    protected $fillable = [
        'sheet_page_id',
        'sheet_key',
        'row_key',
        'row_fingerprint',
        'position',
        'payload',
        'no_kp',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function page(): BelongsTo
    {
        return $this->belongsTo(SheetPage::class, 'sheet_page_id');
    }
}
