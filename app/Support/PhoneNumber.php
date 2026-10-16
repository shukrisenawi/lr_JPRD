<?php

namespace App\Support;

class PhoneNumber
{
    public static function normalize(?string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone ?? '');

        if (str_starts_with($digits, '0060')) {
            $digits = '0'.substr($digits, 4);
        } elseif (str_starts_with($digits, '60')) {
            $digits = '0'.substr($digits, 2);
        }

        return $digits;
    }
}
