<?php

namespace App\Http\Controllers;

use App\Models\CommitteeMembership;
use App\Models\KadTen;
use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class KkrTenController extends Controller
{
    private function eligibleMembers(Builder $query): void
    {
        $query->where('status', 'aktif')->where('is_manual', false)
            ->where(fn (Builder $cula) => $cula->whereIn('cula_code', ['2', '4P'])->orWhere('cula_code', 'like', '3%'));
    }

    private function families(Request $request): Builder
    {
        return PemilihFamily::query()->whereNotNull('reviewed_at')
            ->whereNotNull('address')->where('address', '!=', '')
            ->whereHas('members', function (Builder $query) use ($request): void {
                $this->eligibleMembers($query);
                $request->user()->applyScopeToPemilihQuery($query);
            });
    }

    public function index(Request $request)
    {
        $udm = trim((string) $request->query('udm', ''));
        $kads = KadTen::query()->kadTenForUser($request->user())
            ->with(['pemimpin', 'committeeMembership.position', 'families.members' => function (BelongsToMany $relation) use ($request): void {
                $this->eligibleMembers($relation->getQuery());
                $request->user()->applyScopeToPemilihQuery($relation->getQuery());
            }]);
        if ($udm !== '') {
            $kads->where(fn (Builder $query) => $query->where('scope_key', $udm)->orWhere('parent_scope_name', $udm));
        }
        $udms = PemilihRecord::query()->where('status', 'aktif');
        $request->user()->applyScopeToPemilihQuery($udms);
        $udmNames = $udms->whereNotNull('dm')->where('dm', '!=', '')->distinct()->orderBy('dm')->pluck('dm');
        $summaryKads = KadTen::query()->kadTenForUser($request->user())
            ->with('pemimpin:id,dm')->withCount('families')->get();
        $familiesByUdm = PemilihRecord::query()
            ->join('pemilih_family_members', 'pemilih_family_members.pemilih_record_id', '=', 'pemilih_records.id')
            ->join('pemilih_families', 'pemilih_families.id', '=', 'pemilih_family_members.pemilih_family_id')
            ->whereNotNull('pemilih_families.reviewed_at')
            ->whereNotNull('pemilih_families.address')->where('pemilih_families.address', '!=', '');
        $this->eligibleMembers($familiesByUdm);
        $request->user()->applyScopeToPemilihQuery($familiesByUdm);
        $familyCounts = $familiesByUdm->select('dm')
            ->selectRaw('COUNT(DISTINCT pemilih_families.id) as family_count')
            ->groupBy('dm')->pluck('family_count', 'dm');
        $udmSummaries = $udmNames->map(function (string $name) use ($summaryKads, $familyCounts): array {
            $cards = $summaryKads->filter(fn (KadTen $kad) => $kad->pemimpin?->dm === $name);
            $families = (int) ($familyCounts[$name] ?? 0);

            return [
                'key' => $name,
                'name' => $name,
                'existing_leaders' => $cards->count(),
                'required_leaders' => (int) ceil($families / 10),
                'total_families' => $families,
                'assigned_families' => $cards->sum('families_count'),
            ];
        });

        return Inertia::render('KadTen/KkrIndex', [
            'kads' => $kads->latest()->paginate(20)->withQueryString(),
            'udms' => $udmNames,
            'udm_summaries' => $udmSummaries,
            'filters' => ['udm' => $udm],
            'can_manage' => strtolower((string) $request->user()->access_level) === 'udm'
                && filled($request->user()->accessScope()['dm'] ?? null),
            'can_auto' => $request->user()->isMasterAdmin(),
            'available_families' => $this->families($request)->whereDoesntHave('kadTens')->count(),
        ]);
    }

    public function autoFamilies(Request $request)
    {
        abort_unless($request->user()->isMasterAdmin(), 403);
        $assigned = DB::transaction(function () use ($request): int {
            $families = $this->families($request)->whereDoesntHave('kadTens')
                ->with(['members' => fn (BelongsToMany $relation) => $this->eligibleMembers($relation->getQuery())])
                ->orderBy('id')->lockForUpdate()->get();
            $kads = KadTen::query()->with('pemimpin')->withCount('families')->orderBy('id')->lockForUpdate()->get();
            $leaders = CommitteeMembership::query()->with('voter')->whereIn('level', ['udm', 'cawangan'])
                ->whereHas('voter', fn (Builder $query) => $query->where('status', 'aktif'))
                ->orderByRaw("CASE WHEN level = 'udm' THEN 0 ELSE 1 END")->orderBy('id')->get()->unique('pemilih_record_id');
            foreach ($leaders as $membership) {
                $leader = $membership->voter;
                if ($kads->contains('pemimpin_id', $leader->id)) {
                    continue;
                }
                $needed = $families->filter(fn ($family) => $family->members->contains('dm', $leader->dm))->count();
                $capacity = $kads->filter(fn ($kad) => $kad->pemimpin?->dm === $leader->dm)
                    ->sum(fn ($kad) => max(0, 10 - $kad->families_count));
                if ($needed <= $capacity) {
                    continue;
                }
                $kad = KadTen::query()->create([
                    'name' => $leader->name, 'pemimpin_id' => $leader->id,
                    'committee_membership_id' => $membership->id, 'level' => $membership->level,
                    'scope_key' => $membership->level === 'udm' ? $leader->dm : $leader->dm.'|'.$leader->locality,
                    'scope_name' => $membership->level === 'udm' ? $leader->dm : $leader->locality,
                    'parent_scope_name' => $membership->level === 'cawangan' ? $leader->dm : null,
                    'created_by' => $request->user()->id,
                ]);
                $kad->setRelation('pemimpin', $leader);
                $kad->families_count = 0;
                $kads->push($kad);
            }
            $assigned = 0;
            foreach ($families as $family) {
                $candidates = $kads->filter(function ($kad) use ($family): bool {
                    if (! $kad->pemimpin || $kad->families_count >= 10) {
                        return false;
                    }

                    // Semua ahli sasaran mesti berada dalam skop ketua yang sama.
                    return $family->members->every(fn ($member) => $member->dm === $kad->pemimpin->dm
                        && ($kad->level === 'udm' || $member->locality === $kad->pemimpin->locality));
                });
                $kad = $candidates->sortByDesc(function ($kad) use ($family): int {
                    $address = $this->normalize($family->address);
                    $leaderAddress = $this->normalize($kad->pemimpin->alamat_kediaman ?: $kad->pemimpin->address ?: $kad->pemimpin->alamat_kp);
                    $score = 0;
                    if ($address !== '' && $leaderAddress !== '') {
                        similar_text($address, $leaderAddress, $score);
                    }

                    return (int) round($score * 100) - $kad->families_count;
                })->first();
                if ($kad) {
                    $kad->families()->attach($family->id);
                    $kad->families_count++;
                    $assigned++;
                }
            }

            return $assigned;
        });

        return back()->with('success', "$assigned keluarga telah disemak berjaya diagihkan kepada ketua KKR10 (maksimum 10 keluarga). ");
    }

    private function normalize(?string $value): string
    {
        return trim(preg_replace('/[^\pL\pN]+/u', ' ', mb_strtolower($value ?? '')));
    }

    public function reset(Request $request)
    {
        abort_unless($request->user()->isMasterAdmin(), 403);
        DB::transaction(function (): void {
            KadTen::query()->lockForUpdate()->get(['id']);
            DB::table('kad_ten_families')->delete();
        });

        return back()->with('success', 'Tugasan keluarga KKR10 dikosongkan. Ketua dikekalkan.');
    }

    public function removeFamily(Request $request, KadTen $kadTen, PemilihFamily $family)
    {
        abort_unless($kadTen->isManageableBy($request->user()), 403);
        abort_unless($kadTen->families()->whereKey($family->id)->exists(), 404);
        $kadTen->families()->detach($family->id);

        return back()->with('success', 'Keluarga dikeluarkan daripada jagaan ketua KKR10. Rekod keluarga dikekalkan.');
    }
}
