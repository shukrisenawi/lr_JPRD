<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramFile extends Model
{
    protected $fillable = [
        'program_id',
        'original_name',
        'stored_path',
        'stored_name',
        'file_type',
        'file_label',
        'file_category',
        'file_size',
        'mime_type',
        'size',
        'type',
        'user_id',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
