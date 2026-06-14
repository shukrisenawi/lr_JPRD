<?php

namespace App\Models;

use App\Support\ModuleRegistry;
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

        $access = $this->access_modules ?? [];

        if (in_array($module, $access, true)) {
            return true;
        }

        foreach (ModuleRegistry::children($module) as $childKey => $_) {
            if (in_array($childKey, $access, true)) {
                return true;
            }
        }

        $parts = explode('.', $module);
        while (count($parts) > 1) {
            array_pop($parts);
            if (in_array(implode('.', $parts), $access, true)) {
                return true;
            }
        }

        return false;
    }
}
