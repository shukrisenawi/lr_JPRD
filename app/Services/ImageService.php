<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ImageService
{
    public static function resizeIfNeeded(UploadedFile $file, string $path, string $disk = 'public'): string
    {
        $maxDimension = 500;
        $threshold = 300;

        $tmpPath = $file->getRealPath();
        [$width, $height] = getimagesize($tmpPath);

        if ($width <= $threshold && $height <= $threshold) {
            return $file->store($path, $disk);
        }

        $ratio = $width / $height;
        if ($width >= $height) {
            $newWidth = $maxDimension;
            $newHeight = (int) round($maxDimension / $ratio);
        } else {
            $newHeight = $maxDimension;
            $newWidth = (int) round($maxDimension * $ratio);
        }

        $src = match ($file->getMimeType()) {
            'image/jpeg', 'image/jpg' => imagecreatefromjpeg($tmpPath),
            'image/png' => imagecreatefrompng($tmpPath),
            'image/gif' => imagecreatefromgif($tmpPath),
            'image/webp' => imagecreatefromwebp($tmpPath),
            default => null,
        };

        if (!$src) {
            return $file->store($path, $disk);
        }

        $dst = imagecreatetruecolor($newWidth, $newHeight);

        if ($file->getMimeType() === 'image/png' || $file->getMimeType() === 'image/webp') {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        }

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        $storedName = md5(uniqid()) . '.' . $file->getClientOriginalExtension();
        $storedPath = $path . '/' . $storedName;
        $fullPath = Storage::disk($disk)->path($storedPath);

        $dir = dirname($fullPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        match ($file->getMimeType()) {
            'image/jpeg', 'image/jpg' => imagejpeg($dst, $fullPath, 90),
            'image/png' => imagepng($dst, $fullPath, 9),
            'image/gif' => imagegif($dst, $fullPath),
            'image/webp' => imagewebp($dst, $fullPath, 90),
        };

        imagedestroy($src);
        imagedestroy($dst);

        return $storedPath;
    }
}
