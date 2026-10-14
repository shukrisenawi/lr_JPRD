<?php

namespace App\Http\Controllers;

use App\Models\GroupPemilih;
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
        $groups = GroupPemilih::with('kodCulas')->orderBy('sort_order')->orderBy('nama_group')->get();
        $culaOptions = collect(CulaCodes::options())->reject(fn ($option) => in_array($option['code'], ['2', '4P']) || str_starts_with($option['code'], '3'))->values();
        $validated = $request->validate([
            'udm' => ['nullable', 'string', Rule::in($udms->all())],
            'cula_codes' => ['nullable', 'array'],
            'cula_codes.*' => ['string', Rule::in([...$culaOptions->pluck('code')->all(), '__empty'])],
            'group_ids' => ['nullable', 'array'],
            'group_ids.*' => ['integer', Rule::in($groups->pluck('id')->all())],
        ]);
        $udm = $validated['udm'] ?? '';
        $culaCodes = $validated['cula_codes'] ?? [];
        $groupIds = array_map('intval', $validated['group_ids'] ?? []);
        $selectedGroups = $groups->whereIn('id', $groupIds);
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
        $this->onlyTargetVoters($counts);
        $this->applyFilters($counts, $culaCodes, $selectedGroups);
        $counts = $counts->pluck('family_count', 'dm');

        $families = null;
        if ($udm !== '') {
            $families = PemilihFamily::query()
                ->whereNotNull('reviewed_at')
                ->whereHas('members', function ($query) use ($user, $udm, $locality, $culaCodes, $selectedGroups): void {
                    $user->applyScopeToPemilihQuery($query);
                    $this->onlyTargetVoters($query);
                    $this->applyFilters($query, $culaCodes, $selectedGroups);
                    $query->where('dm', $udm);
                    if ($locality !== '') {
                        $query->where('locality', $locality);
                    }
                })
                ->with(['members' => function ($query) use ($user, $culaCodes, $selectedGroups): void {
                    // Show every family member the user may access, not only the selected UDM.
                    $user->applyScopeToPemilihQuery($query);
                    $this->onlyTargetVoters($query);
                    $this->applyFilters($query, $culaCodes, $selectedGroups);
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
            'filter_cula_codes' => $culaOptions->push(['code' => '__empty', 'label' => 'Tiada kod cula']),
            'pemilih_groups' => $groups->map(fn ($group) => ['id' => $group->id, 'name' => $group->nama_group])->values(),
            'filters' => ['udm' => $udm, 'locality' => $locality, 'cula_codes' => $culaCodes, 'group_ids' => $groupIds],
            'localities' => $localities->values(),
            'udmSummaries' => $udms->map(fn (string $name): array => [
                'udm' => $name,
                'families' => (int) ($counts[$name] ?? 0),
            ])->values(),
            'families' => $families,
        ]);
    }

    private function applyFilters($query, array $codes, $groups): void
    {
        if ($codes !== []) {
            $query->where(function ($query) use ($codes): void {
                $query->whereIn('pemilih_records.cula_code', array_diff($codes, ['__empty']));
                if (in_array('__empty', $codes)) {
                    $query->orWhereNull('pemilih_records.cula_code')->orWhere('pemilih_records.cula_code', '');
                }
            });
        }
        if ($groups->isNotEmpty()) {
            $query->where(function ($query) use ($groups): void {
                foreach ($groups as $group) {
                    $query->orWhere(function ($query) use ($group): void {
                        $codes = $group->kodCulas->pluck('kod_cula')->filter()->all();
                        if ($codes !== []) {
                            $query->whereIn('pemilih_records.cula_code', $codes);
                        }
                        if ($group->keturunan) {
                            $query->where('pemilih_records.race', $group->keturunan);
                        }
                        if ($group->jantina) {
                            $query->where('pemilih_records.gender', $group->jantina);
                        }
                        if ($group->umur_dari !== null || $group->umur_akhir !== null) {
                            $prefixes = [];
                            for ($yy = 0; $yy <= 99; $yy++) {
                                $age = now()->year - ($yy > (int) now()->format('y') ? 1900 + $yy : 2000 + $yy);
                                if ($age >= ($group->umur_dari ?? 0) && $age <= ($group->umur_akhir ?? 999)) {
                                    $prefixes[] = str_pad((string) $yy, 2, '0', STR_PAD_LEFT);
                                }
                            }
                            $query->where(function ($query) use ($prefixes): void {
                                $query->whereRaw('1 = 0');
                                foreach ($prefixes as $prefix) {
                                    $query->orWhere('pemilih_records.no_kp', 'like', $prefix.'%');
                                }
                            });
                        }
                    });
                }
            });
        }
    }

    private function onlyTargetVoters($query): void
    {
        $query->where(function ($query): void {
            $query->whereNull('pemilih_records.cula_code')
                ->orWhere(function ($query): void {
                    $query->whereRaw("UPPER(TRIM(pemilih_records.cula_code)) NOT IN ('2', '4P')")
                        ->whereRaw("UPPER(TRIM(pemilih_records.cula_code)) NOT LIKE '3%'");
                });
        });
    }
}
