<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['udm', 'kategori_id', 'jenis_dana_lain', 'jenis', 'jumlah', 'tarikh', 'keterangan', 'catatan', 'created_by'])]
class Dana extends Model
{
    protected $table = 'dana';

    protected function casts(): array
    {
        return [
            'jumlah' => 'decimal:2',
            'tarikh' => 'date',
        ];
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(DanaKategori::class, 'kategori_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
