<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AhliPasController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tab = $request->string('tab')->toString() === 'statistik' ? 'statistik' : 'senarai';
        $base = $this->baseQuery($user);

        $availableDms = (clone $base)
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->where('dm', '!=', '-')
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->values()
            ->all();

        $availableLocalities = (clone $base)
            ->whereNotNull('locality')
            ->where('locality', '!=', '')
            ->where('locality', '!=', '-')
            ->select('locality')
            ->distinct()
            ->orderBy('locality')
            ->pluck('locality')
            ->values()
            ->all();

        $filters = [
            'udm' => $request->string('udm')->trim()->toString(),
            'locality' => $request->string('locality')->trim()->toString(),
            'q' => $request->string('q')->trim()->toString(),
        ];

        $membersQuery = $this->applyFilters(clone $base, $filters);
        $members = $membersQuery
            ->select(['id', 'name', 'no_kp', 'old_ic', 'no_ahli', 'dm', 'locality'])
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('AhliPas/Index', [
            'active_tab' => $tab,
            'filters' => $filters,
            'available_dms' => $availableDms,
            'available_localities' => $availableLocalities,
            'members' => $members,
            'statistics' => [
                'total' => (clone $base)->count(),
                'by_udm' => $this->groupByUdm(clone $base),
                'by_locality' => $this->groupByLocality(clone $base),
            ],
        ]);
    }

    private function baseQuery($user): Builder
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereRaw("TRIM(COALESCE(no_ahli, '')) NOT IN ('', '-')");

        $user?->applyScopeToPemilihQuery($query);

        return $query;
    }

    private function applyFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['udm'], fn (Builder $builder, string $udm) => $builder->where('dm', $udm))
            ->when($filters['locality'], fn (Builder $builder, string $locality) => $builder->where('locality', $locality))
            ->when($filters['q'], function (Builder $builder, string $search) {
                $like = "%{$search}%";

                $builder->where(function (Builder $nested) use ($like) {
                    $nested->where('name', 'like', $like)
                        ->orWhere('no_kp', 'like', $like)
                        ->orWhere('old_ic', 'like', $like)
                        ->orWhere('no_ahli', 'like', $like);
                });
            });
    }

    private function groupByUdm(Builder $query): array
    {
        return $query
            ->selectRaw("COALESCE(NULLIF(NULLIF(dm, ''), '-'), 'Tidak Ditetapkan') as udm, COUNT(*) as total")
            ->groupBy('dm')
            ->orderByDesc('total')
            ->orderBy('dm')
            ->get()
            ->map(fn (PemilihRecord $row) => [
                'udm' => $row->udm,
                'total' => (int) $row->total,
            ])
            ->values()
            ->all();
    }

    private function groupByLocality(Builder $query): array
    {
        return $query
            ->selectRaw("COALESCE(NULLIF(NULLIF(locality, ''), '-'), 'Tidak Ditetapkan') as locality, COALESCE(NULLIF(NULLIF(dm, ''), '-'), 'Tidak Ditetapkan') as udm, COUNT(*) as total")
            ->groupBy('dm', 'locality')
            ->orderBy('dm')
            ->orderByDesc('total')
            ->orderBy('locality')
            ->get()
            ->map(fn (PemilihRecord $row) => [
                'udm' => $row->udm,
                'locality' => $row->locality,
                'total' => (int) $row->total,
            ])
            ->values()
            ->all();
    }
}
