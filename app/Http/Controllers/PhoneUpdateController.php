<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use App\Models\ProgramAttendee;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PhoneUpdateController extends Controller
{
    private function resolveRecord(Request $request): PemilihRecord
    {
        $user = $request->user();
        $modules = ['carian-pemilih', 'culaan.senarai', 'culaan-bot', 'vcc', 'plk', 'program', 'keluarga-pemilih', 'jawatankuasa.ajk-bukan-pas', 'pusat-khidmat'];
        abort_unless(collect($modules)->contains(fn ($module) => $user->canAccessModule($module)), 403);

        $data = $request->validate([
            'identity' => ['required', 'string', 'max:100'],
        ]);

        $record = PemilihRecord::query()->where('status', 'aktif')
            ->where(function ($query) use ($data) {
                $query->where('no_kp', $data['identity'])->orWhere('old_ic', $data['identity'])->orWhere('identity_number', $data['identity']);
            })->firstOrFail();
        abort_unless($user->canAccessPemilihRecord($record), 403);

        return $record;
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json(['name' => $this->resolveRecord($request)->name]);
    }

    public function update(Request $request): JsonResponse
    {
        $record = $this->resolveRecord($request);
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:40', 'regex:/^\+?[0-9\s()\-]+$/'],
        ]);
        $phone = PhoneNumber::normalize($data['phone']);
        if (strlen($phone) < 9 || strlen($phone) > 15) {
            throw ValidationException::withMessages(['phone' => 'Sila masukkan nombor telefon yang sah (9 hingga 15 digit).']);
        }

        DB::transaction(function () use ($record, $phone) {
            $record->update(['phone_mobile' => $phone]);
            if ($record->no_kp || $record->old_ic) {
                ProgramAttendee::query()->where(function ($query) use ($record) {
                    if ($record->no_kp) {
                        $query->where('no_kp', $record->no_kp);
                    }
                    if ($record->old_ic) {
                        $query->orWhere('old_ic', $record->old_ic);
                    }
                })->update(['phone_mobile' => $phone]);
            }
            DB::table('phone_verifications')->where('pemilih_record_id', $record->id)
                ->whereNotIn('phone', array_filter([$phone, PhoneNumber::normalize($record->phone_home)]))->delete();
        });

        return response()->json(['message' => 'Nombor telefon berjaya dikemas kini.']);
    }
}
