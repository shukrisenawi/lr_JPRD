<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PhoneVerificationController extends Controller
{
    public function update(Request $request, PemilihRecord $pemilihRecord): RedirectResponse
    {
        $user = $request->user();
        $query = PemilihRecord::query()->whereKey($pemilihRecord->id)->where('status', 'aktif');
        $user->applyScopeToPemilihQuery($query);
        abort_unless($query->exists(), 403);

        $data = $request->validate([
            'phone' => ['required', 'string', 'max:40'],
            'verified' => ['required', 'boolean'],
            'is_valid' => ['sometimes', 'required', 'boolean'],
        ]);
        $phone = PhoneNumber::normalize($data['phone']);
        abort_unless(strlen($phone) >= 9 && strlen($phone) <= 15 && in_array($phone, [
            PhoneNumber::normalize($pemilihRecord->phone_mobile),
            PhoneNumber::normalize($pemilihRecord->phone_home),
        ], true), 422, 'Nombor telefon tidak sah atau telah berubah.');

        if ($data['verified']) {
            DB::table('phone_verifications')->upsert([[
                'phone' => $phone,
                'pemilih_record_id' => $pemilihRecord->id,
                'verified_by' => $user->id,
                'is_valid' => $data['is_valid'] ?? true,
                'created_at' => now(),
                'updated_at' => now(),
            ]], ['phone'], ['pemilih_record_id', 'verified_by', 'is_valid', 'updated_at']);
        } else {
            DB::table('phone_verifications')->where('phone', $phone)->delete();
        }

        return back()->with('success', $data['verified']
            ? (($data['is_valid'] ?? true) ? 'Nombor telefon disahkan sah.' : 'Nombor telefon ditandakan tidak sah.')
            : 'Pengesahan nombor telefon dibatalkan.');
    }
}
