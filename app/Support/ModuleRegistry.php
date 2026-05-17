<?php

namespace App\Support;

class ModuleRegistry
{
    public static function all(): array
    {
        return config('admin-modules', []);
    }

    public static function keys(): array
    {
        $keys = [];
        foreach (self::all() as $key => $module) {
            $keys[] = $key;
            if (isset($module['children'])) {
                $keys = array_merge($keys, array_keys($module['children']));
            }
        }
        return $keys;
    }

    public static function children(string $key): array
    {
        $module = self::all()[$key] ?? [];
        return $module['children'] ?? [];
    }

    public static function hasChildren(string $key): bool
    {
        return ! empty(self::children($key));
    }
}
