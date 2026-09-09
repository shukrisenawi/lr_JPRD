<?php

namespace App\Http\Middleware;

use App\Models\PemilihRecord;
use App\Models\PusatKhidmatData;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePemilihScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $pemilihRecord = $request->route('pemilihRecord');

        if ($pemilihRecord instanceof PemilihRecord) {
            abort_unless($user?->canAccessPemilihRecord($pemilihRecord), 403);
        }

        $pusatRecord = $request->route('record');
        if ($pusatRecord instanceof PusatKhidmatData) {
            $pusatRecord->loadMissing('pemilihRecord');
            abort_unless(
                $pusatRecord->pemilihRecord === null
                    ? $user?->isMasterAdmin()
                    : $user?->canAccessPemilihRecord($pusatRecord->pemilihRecord),
                403,
            );
        }

        return $next($request);
    }
}
