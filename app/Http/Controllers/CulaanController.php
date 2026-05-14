<?php

namespace App\Http\Controllers;

use App\Models\CulaWorkItem;
use App\Models\PemilihRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CulaanController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->resolveFilters($request);
        $voters = $this->paginateVoters($filters);

        return Inertia::render('Culaan/Index', [
            'filters' => $filters,
            'requires_udm' => true,
            'summary' => [
                'total' => $voters->total(),
            ],
            'udms' => $this->availableUdms(),
            'localities' => $this->availableLocalities($filters['udm'], $filters['locality']),
            'voters' => $voters,
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json(['suggestions' => []]);
        }

        $filters = $this->resolveFilters($request);

        if ($filters['udm'] === '') {
            return response()->json(['suggestions' => []]);
        }

        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($query)) ?: []));

        $suggestions = $this->buildEligibleVotersQuery($filters)
            ->where(function (Builder $builder) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $like = '%'.$keyword.'%';

                    $builder->where(function (Builder $subQuery) use ($keyword, $like) {
                        $subQuery->whereRaw('LOWER(name) like ?', [$like])
                            ->orWhereRaw('LOWER(dm) like ?', [$like])
                            ->orWhereRaw('LOWER(locality) like ?', [$like]);

                        if (preg_match('/\d/', $keyword)) {
                            $digitLike = '%'.preg_replace('/\D+/', '', $keyword).'%';
                            $subQuery->orWhere('no_kp', 'like', $digitLike)
                                ->orWhere('old_ic', 'like', $digitLike)
                                ->orWhere('phone_home', 'like', $digitLike)
                                ->orWhere('phone_mobile', 'like', $digitLike);
                        }
                    });
                }
            })
            ->orderBy('name')
            ->limit(8)
            ->get()
            ->map(fn (PemilihRecord $voter) => $this->transformVoter($voter))
            ->values();

        return response()->json([
            'suggestions' => $suggestions,
        ]);
    }

    public function storeMark(Request $request, PemilihRecord $pemilihRecord): RedirectResponse|JsonResponse
    {
        abort_unless($this->isEligibleForCulaan($pemilihRecord), 422);

        CulaWorkItem::query()->firstOrCreate(
            ['pemilih_record_id' => $pemilihRecord->id],
            [
                'marked_by' => $request->user()->id,
                'marked_at' => now(),
                'notes' => null,
            ]
        );

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Pemilih ditanda sebagai sudah diproses.',
                'marked' => true,
                'voter_id' => $pemilihRecord->id,
            ]);
        }

        return redirect()
            ->route('culaan.index')
            ->with('success', 'Pemilih ditanda sebagai sudah diproses.');
    }

    public function destroyMark(Request $request, PemilihRecord $pemilihRecord): RedirectResponse|JsonResponse
    {
        CulaWorkItem::query()
            ->where('pemilih_record_id', $pemilihRecord->id)
            ->delete();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Tanda culaan berjaya dibuka semula.',
                'marked' => false,
                'voter_id' => $pemilihRecord->id,
            ]);
        }

        return redirect()
            ->route('culaan.index')
            ->with('success', 'Tanda culaan berjaya dibuka semula.');
    }

    private function buildEligibleVotersQuery(array $filters): Builder
    {
        return PemilihRecord::query()
            ->with('culaWorkItem')
            ->where('status', 'aktif')
            ->where(function (Builder $builder) {
                $builder->whereNull('cula_code')
                    ->orWhere('cula_code', '')
                    ->orWhere('cula_code', '?')
                    ->orWhereRaw('UPPER(COALESCE(cula_display_label, \'\')) like ?', ['%BELUM DICULA%']);
            })
            ->when($filters['udm'] !== '', fn (Builder $builder) => $builder->where('dm', $filters['udm']))
            ->when($filters['locality'] !== '', fn (Builder $builder) => $builder->where('locality', $filters['locality']))
            ->when(
                $filters['show_marked'],
                fn (Builder $builder) => $builder->whereHas('culaWorkItem'),
                fn (Builder $builder) => $builder->whereDoesntHave('culaWorkItem')
            );
    }

    private function paginateVoters(array $filters): LengthAwarePaginator
    {
        if ($filters['udm'] === '') {
            return new LengthAwarePaginator(
                collect(),
                0,
                20,
                LengthAwarePaginator::resolveCurrentPage(),
                [
                    'path' => request()->url(),
                    'query' => request()->query(),
                ]
            );
        }

        return $this->buildEligibleVotersQuery($filters)
            ->orderBy('locality')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PemilihRecord $voter) => $this->transformVoter($voter));
    }

    private function availableUdms(): array
    {
        return PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->values()
            ->all();
    }

    private function availableLocalities(string $udm, string $selectedLocality = ''): array
    {
        if ($udm === '') {
            return [];
        }

        $localities = PemilihRecord::query()
            ->where('status', 'aktif')
            ->when($udm !== '', fn (Builder $builder) => $builder->where('dm', $udm))
            ->whereNotNull('locality')
            ->where('locality', '!=', '')
            ->select('locality')
            ->distinct()
            ->orderBy('locality')
            ->pluck('locality')
            ->values()
            ->all();

        if ($selectedLocality === '' || ! in_array($selectedLocality, $localities, true)) {
            return $localities;
        }

        return array_values([
            $selectedLocality,
            ...array_values(array_filter($localities, fn (string $locality) => $locality !== $selectedLocality)),
        ]);
    }

    private function resolveFilters(Request $request): array
    {
        return [
            'udm' => trim((string) $request->query('udm', '')),
            'locality' => trim((string) $request->query('locality', '')),
            'show_marked' => $request->boolean('show_marked'),
        ];
    }

    private function transformVoter(PemilihRecord $voter): array
    {
        return [
            'id' => $voter->id,
            'name' => $voter->name,
            'no_kp' => $voter->no_kp,
            'old_ic' => $voter->old_ic,
            'phone_mobile' => $voter->phone_mobile,
            'phone_home' => $voter->phone_home,
            'address' => $voter->address,
            'dm' => $voter->dm,
            'locality' => $voter->locality,
            'status' => $voter->status,
            'cula_code' => $voter->cula_code,
            'cula_display_label' => $voter->cula_display_label,
            'is_marked' => $voter->culaWorkItem !== null,
            'telegram_identity' => $voter->no_kp ?: $voter->old_ic,
        ];
    }

    private function isEligibleForCulaan(PemilihRecord $voter): bool
    {
        if ($voter->status !== 'aktif') {
            return false;
        }

        $label = mb_strtoupper((string) $voter->cula_display_label);
        $code = (string) ($voter->cula_code ?? '');

        return $code === '' || $code === '?' || str_contains($label, 'BELUM DICULA');
    }
}
