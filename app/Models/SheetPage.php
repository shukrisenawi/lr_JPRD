<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SheetPage extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'sheet_key',
        'page_number',
        'headers',
        'source_total_rows',
    ];

    protected $casts = [
        'headers' => 'array',
    ];

    public function rows(): HasMany
    {
        return $this->hasMany(SheetPageRow::class)->orderBy('position');
    }
}
