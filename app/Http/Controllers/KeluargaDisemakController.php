<?php

namespace App\Http\Controllers;

use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
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
                ->whereHas('members', function ($query) use ($user, $udm): void {
                    $user->applyScopeToPemilihQuery($query);
                    $query->where('dm', $udm);
                })
                ->with(['members' => function ($query) use ($user): void {
                    // Show every family member the user may access, not only the selected UDM.
                    $user->applyScopeToPemilihQuery($query);
                    $query->select('pemilih_records.id', 'name', 'dm', 'locality');
                }])
                ->orderBy('name')->orderBy('id')
                ->paginate(12)->withQueryString()
                ->through(fn (PemilihFamily $family): array => [
                    'id' => $family->id,
                    'name' => $family->name,
                    'address' => $family->address,
                    'reviewed_at' => $family->reviewed_at->format('d/m/Y'),
                    'members' => $family->members->map(fn (PemilihRecord $member): array => [
                        'id' => $member->id,
                        'name' => $member->name,
                        'udm' => $member->dm,
                        'locality' => $member->locality,
                    ])->values(),
                ]);
        }

        return Inertia::render('KeluargaDisemak/Index', [
            'filters' => ['udm' => $udm],
            'udmSummaries' => $udms->map(fn (string $name): array => [
                'udm' => $name,
                'families' => (int) ($counts[$name] ?? 0),
            ])->values(),
            'families' => $families,
        ]);
    }
}
