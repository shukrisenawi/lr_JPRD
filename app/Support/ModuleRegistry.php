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
        return array_keys(self::all());
    }
}
