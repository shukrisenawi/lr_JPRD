<?php

namespace App\Services;

use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FamilyCreationMovementService
{
    private const RESET_KEY = 'family_creation_movement_reset';

    public function record(PemilihFamily $family, Collection $voters): void
    {
        $rows = $voters->map(fn (PemilihRecord $voter) => [
            'family_id' => $family->id,
            'dm' => (string) $voter->dm,
            'locality' => (string) $voter->locality,
            'created_at' => $family->created_at,
        ])->unique(fn (array $row) => json_encode([$row['dm'], $row['locality']]))->values()->all();

        if ($rows !== []) {
            DB::table('family_creation_movements')->insert($rows);
        }
    }

    public function summary(User $user): array
    {
        $reset = json_decode(Setting::valueOf(self::RESET_KEY, '{}'), true) ?? [];
        $query = DB::table('family_creation_movements')->where('id', '>', (int) ($reset['last_id'] ?? 0));
        $user->applyScopeToPemilihQuery($query);
        $counts = (clone $query)->select('dm')->selectRaw('COUNT(DISTINCT family_id) as total')
            ->groupBy('dm')->pluck('total', 'dm');
        $voters = PemilihRecord::query();
        $user->applyScopeToPemilihQuery($voters);

        $familyMembers = (clone $voters)
            ->whereRaw("UPPER(TRIM(COALESCE(pemilih_records.race, ''))) IN (?, ?)", ['MELAYU', 'M'])
            ->join('pemilih_family_members', 'pemilih_family_members.pemilih_record_id', '=', 'pemilih_records.id');
        $familyCounts = (clone $familyMembers)->select('dm')
            ->selectRaw('COUNT(DISTINCT pemilih_family_members.pemilih_family_id) as total')
            ->groupBy('dm')->pluck('total', 'dm');
        $unassigned = (clone $voters)->where('status', 'aktif')
            ->whereRaw("UPPER(TRIM(COALESCE(pemilih_records.race, ''))) IN (?, ?)", ['MELAYU', 'M'])
            ->whereDoesntHave('families');
        $unassignedCounts = (clone $unassigned)->select('dm')->selectRaw('COUNT(*) as total')
            ->groupBy('dm')->pluck('total', 'dm');
        $udms = $voters->whereNotNull('dm')->where('dm', '!=', '')->distinct()->pluck('dm')
            ->merge($counts->keys())->merge($familyCounts->keys())->merge($unassignedCounts->keys())
            ->map(fn ($dm) => (string) $dm)->unique()->sort()->values();

        return [
            'rows' => $udms->map(fn (string $dm) => [
                'udm' => $dm === '' ? 'Tiada UDM' : $dm,
                'total' => (int) ($counts[$dm] ?? 0),
                'family_count' => (int) ($familyCounts[$dm] ?? 0),
                'unassigned_voters' => (int) ($unassignedCounts[$dm] ?? 0),
            ])->all(),
            'total' => (clone $query)->distinct()->count('family_id'),
            'family_count' => (clone $familyMembers)->distinct()->count('pemilih_family_members.pemilih_family_id'),
            'unassigned_voters' => $unassigned->count(),
            'reset_at' => $reset['reset_at'] ?? null,
            'can_reset' => $user->isMasterAdmin(),
        ];
    }

    public function reset(User $user): void
    {
        Setting::setValue(self::RESET_KEY, json_encode([
            'last_id' => (int) DB::table('family_creation_movements')->max('id'),
            'reset_at' => now()->setTimezone('Asia/Kuala_Lumpur')->format('d-m-Y h:i:s A'),
            'reset_by' => $user->id,
        ]));
    }
}
