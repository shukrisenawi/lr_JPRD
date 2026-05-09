<?php

namespace App\Models;

use Database\Factories\RoleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'is_master_admin', 'access_modules'])]
class Role extends Model
{
    /** @use HasFactory<RoleFactory> */
    use HasFactory;

    protected static function newFactory(): RoleFactory
    {
        return RoleFactory::new();
    }

    protected function casts(): array
    {
        return [
            'is_master_admin' => 'boolean',
            'access_modules' => 'array',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function hasModuleAccess(string $module): bool
    {
        if ($this->is_master_admin) {
            return true;
        }

        return in_array($module, $this->access_modules ?? [], true);
    }
}
