<?php

namespace App\Http\Controllers;

use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
use App\Support\CulaCodes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class KeluargaDisemakController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $voters = PemilihRecord::query()->whereNotNull('dm')->where('dm', '!=', '');
        $user->applyScopeToPemilihQuery($voters);
        $udms = $voters->distinct()->orderBy('dm')->pluck('dm');
        $validated = $request->validate([
            'udm' => ['nullable', 'string', Rule::in($udms->all())],
        ]);
        $udm = $validated['udm'] ?? '';
        $localities = $udm !== ''
            ? (clone $voters)->reorder()->where('dm', $udm)
                ->whereNotNull('locality')->where('locality', '!=', '')
                ->distinct()->orderBy('locality')->pluck('locality')
            : collect();
        $locality = $request->validate([
            'locality' => ['nullable', 'string', Rule::in($localities->all())],
        ])['locality'] ?? '';

        $counts = DB::table('pemilih_family_members')
            ->join('pemilih_families', 'pemilih_families.id', '=', 'pemilih_family_members.pemilih_family_id')
            ->join('pemilih_records', 'pemilih_records.id', '=', 'pemilih_family_members.pemilih_record_id')
            ->whereNotNull('pemilih_families.reviewed_at')
            ->select('pemilih_records.dm')
            ->selectRaw('COUNT(DISTINCT pemilih_families.id) as family_count')
            ->groupBy('pemilih_records.dm');
        $user->applyScopeToPemilihQuery($counts);
        $counts = $counts->pluck('family_count', 'dm');

        $families = null;
        if ($udm !== '') {
            $families = PemilihFamily::query()
                ->whereNotNull('reviewed_at')
                ->whereHas('members', function ($query) use ($user, $udm, $locality): void {
                    $user->applyScopeToPemilihQuery($query);
                    $query->where('dm', $udm);
                    if ($locality !== '') {
                        $query->where('locality', $locality);
                    }
                })
                ->with(['members' => function ($query) use ($user): void {
                    // Show every family member the user may access, not only the selected UDM.
                    $user->applyScopeToPemilihQuery($query);
                    $query->select('pemilih_records.*');
                }])
                ->orderBy('name')->orderBy('id')
                ->paginate(12)->withQueryString()
                ->through(fn (PemilihFamily $family): array => [
                    'id' => $family->id,
                    'name' => $family->name,
                    'address' => $family->address,
                    'father_id' => $family->father_pemilih_record_id,
                    'reviewed_at' => $family->reviewed_at->format('d/m/Y'),
                    'members' => $family->members->map(fn (PemilihRecord $member): array => [
                        'id' => $member->id,
                        'name' => $member->name,
                        'udm' => $member->dm,
                        'locality' => $member->locality,
                        'no_kp' => $member->no_kp,
                        'old_ic' => $member->old_ic,
                        'cula_code' => $member->cula_code,
                        'cula_display_label' => $member->cula_display_label,
                        'avatar_url' => $member->avatarUrl(),
                        'gender' => $member->gender,
                        'no_rumah' => $member->no_rumah,
                        'address' => $member->address,
                        'catatan' => $member->catatan,
                        'phone' => $member->phone_mobile ?: $member->phone_home,
                    ])->values(),
                ]);
        }

        return Inertia::render('KeluargaDisemak/Index', [
            'available_cula_codes' => CulaCodes::options(),
            'filters' => ['udm' => $udm, 'locality' => $locality],
            'localities' => $localities->values(),
            'udmSummaries' => $udms->map(fn (string $name): array => [
                'udm' => $name,
                'families' => (int) ($counts[$name] ?? 0),
            ])->values(),
            'families' => $families,
        ]);
    }
}
