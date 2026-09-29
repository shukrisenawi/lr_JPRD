<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'is_other'])]
class DanaKategori extends Model
{
    use HasFactory;

    protected $table = 'dana_kategori';

    protected function casts(): array
    {
        return [
            'is_other' => 'boolean',
        ];
    }

    public function dana(): HasMany
    {
        return $this->hasMany(Dana::class, 'kategori_id');
    }
}
