<?php

namespace App\Http\Controllers;

use App\Models\CulaWorkItem;
use App\Models\PemilihRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CulaanBotController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->resolveFilters($request);
        $voters = $this->paginateVoters($filters);

        return Inertia::render('CulaanBot/Index', [
            'filters' => $filters,
            'summary' => ['total' => $voters->total()],
            'udms' => $this->availableUdms(),
            'localities' => $this->availableLocalities($filters['udm'], $filters['locality']),
            'voters' => $voters,
            'available_cula_codes' => $this->availableCulaCodes(),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        if (mb_strlen($query) < 2) {
            return response()->json(['suggestions' => []]);
        }

        $filters = $this->resolveFilters($request);
        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($query)) ?: []));

        $suggestions = PemilihRecord::query()
            ->where('status', 'aktif')
            ->tap(fn (Builder $b) => $request->user()?->applyScopeToPemilihQuery($b))
            ->with('culaWorkItem.marker')
            ->where(function (Builder $builder) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $like = '%'.$keyword.'%';
                    $builder->where(function (Builder $subQuery) use ($keyword, $like) {
                        $subQuery->whereRaw('LOWER(name) like ?', [$like]);

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
            ->when($filters['udm'] !== '', fn (Builder $b) => $b->where('dm', $filters['udm']))
            ->when($filters['locality'] !== '', fn (Builder $b) => $b->where('locality', $filters['locality']))
            ->orderBy('name')
            ->limit(8)
            ->get()
            ->map(fn (PemilihRecord $voter) => $this->transformVoter($voter))
            ->values();

        return response()->json(['suggestions' => $suggestions]);
    }

    public function storeMark(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        CulaWorkItem::query()->firstOrCreate(
            ['pemilih_record_id' => $pemilihRecord->id],
            [
                'marked_by' => $request->user()->id,
                'marked_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Pemilih ditanda sebagai sudah diproses.',
            'marked' => true,
            'voter_id' => $pemilihRecord->id,
        ]);
    }

    public function destroyMark(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        CulaWorkItem::query()
            ->where('pemilih_record_id', $pemilihRecord->id)
            ->delete();

        $pemilihRecord->update([
            'cula_code' => '?',
            'cula_display_label' => null,
        ]);

        return response()->json([
            'message' => 'Tanda culaan berjaya dibuka semula.',
            'marked' => false,
            'voter_id' => $pemilihRecord->id,
        ]);
    }

    public function updateCula(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        $data = $request->validate([
            'cula_code' => 'required|string',
            'cula_display_label' => 'required|string',
        ]);

        $pemilihRecord->update([
            'cula_code' => $data['cula_code'],
            'cula_display_label' => $data['cula_display_label'],
        ]);

        CulaWorkItem::query()->firstOrCreate(
            ['pemilih_record_id' => $pemilihRecord->id],
            [
                'marked_by' => $request->user()->id,
                'marked_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Kod culaan dikemaskini dan pemilih ditanda.',
            'voter_id' => $pemilihRecord->id,
        ]);
    }

    private function buildEligibleVotersQuery(array $filters): Builder
    {
        $query = PemilihRecord::query()->where('status', 'aktif');
        request()->user()?->applyScopeToPemilihQuery($query);

        $query->when($filters['udm'] !== '', fn (Builder $b) => $b->where('dm', $filters['udm']))
            ->when($filters['locality'] !== '', fn (Builder $b) => $b->where('locality', $filters['locality']));

        $query->when(
            $filters['show_marked'],
            fn (Builder $b) => $b->whereHas('culaWorkItem'),
            fn (Builder $b) => $b->whereDoesntHave('culaWorkItem')
                ->where(function (Builder $q) {
                    $q->whereNull('cula_code')
                      ->orWhere('cula_code', '')
                      ->orWhere('cula_code', '?')
                      ->orWhere('cula_code', 'TIADA')
                      ->orWhereRaw('UPPER(COALESCE(cula_display_label, \'\')) like ?', ['%BELUM DICULA%']);
                })
        );

        return $query;
    }

    private function paginateVoters(array $filters): \Illuminate\Pagination\LengthAwarePaginator
    {
        return $this->buildEligibleVotersQuery($filters)
            ->with('culaWorkItem.marker')
            ->when($filters['udm'] === '', fn (Builder $q) => $q->orderBy('dm'))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PemilihRecord $voter) => $this->transformVoter($voter));
    }

    private function transformVoter(PemilihRecord $voter): array
    {
        return [
            'id' => $voter->id,
            'avatar_url' => $voter->avatarUrl(),
            'name' => $voter->name,
            'no_kp' => $voter->no_kp,
            'old_ic' => $voter->old_ic,
            'age' => $this->calculateAge($voter->no_kp),
            'dm' => trim($voter->dm),
            'locality' => $voter->locality,
            'cula_code' => $voter->cula_code,
            'cula_display_label' => $voter->cula_display_label,
            'is_marked' => $voter->culaWorkItem !== null,
            'marked_by_name' => $voter->culaWorkItem?->marker?->name,
            'telegram_identity' => $voter->no_kp ?: $voter->old_ic,
            'is_manual' => $voter->is_manual,
        ];
    }

    private function calculateAge(?string $noKp): ?int
    {
        if (! $noKp || strlen($noKp) < 2 || ! preg_match('/^(\d{2})/', $noKp, $m)) {
            return null;
        }

        $yy = (int) $m[1];
        $currentYear = (int) now()->format('y');
        $century = $yy > $currentYear ? 1900 : 2000;
        $age = (int) now()->year - ($century + $yy);

        return $age < 18 ? null : $age;
    }

    private function resolveFilters(Request $request): array
    {
        $user = $request->user();
        $scope = $user?->accessScope();
        $defaultUdm = filled($scope['dm'] ?? null) ? $scope['dm'] : '';
        $defaultLocality = filled($scope['locality'] ?? null) ? $scope['locality'] : '';

        $requestedUdm = trim((string) $request->query('udm', ''));
        $requestedLocality = trim((string) $request->query('locality', ''));

        if ($scope !== null) {
            if ($defaultUdm !== '' && $requestedUdm !== '' && $requestedUdm !== $defaultUdm) {
                $requestedUdm = $defaultUdm;
            }
            if ($defaultLocality !== '' && $requestedLocality !== '' && $requestedLocality !== $defaultLocality) {
                $requestedLocality = $defaultLocality;
            }
            if ($requestedUdm === '' && $defaultUdm !== '') {
                $requestedUdm = $defaultUdm;
            }
            if ($requestedLocality === '' && $defaultLocality !== '') {
                $requestedLocality = $defaultLocality;
            }
        }

        return [
            'udm' => $requestedUdm,
            'locality' => $requestedLocality,
            'show_marked' => $request->boolean('show_marked'),
        ];
    }

    private function availableUdms(): array
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('dm')
            ->where('dm', '!=', '');

        request()->user()?->applyScopeToPemilihQuery($query);

        return $query
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->map(fn ($v) => trim($v))
            ->unique()
            ->values()
            ->all();
    }

    private function availableLocalities(string $udm, string $selectedLocality = ''): array
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->when($udm !== '', fn (Builder $b) => $b->where('dm', $udm))
            ->whereNotNull('locality')
            ->where('locality', '!=', '');

        request()->user()?->applyScopeToPemilihQuery($query);

        $localities = $query
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
            ...array_values(array_filter($localities, fn (string $loc) => $loc !== $selectedLocality)),
        ]);
    }

    private function availableCulaCodes(): array
    {
        $codes = [];
        $codeRanges = [
            ['?', '0'],
            range(1, 10),
            [13],
            ['1A', '1B', '1P'],
            ['3B', '3D', '3K', '3M', '3P', '3U'],
            ['7P'],
            [97, 98, 99],
        ];

        foreach ($codeRanges as $range) {
            foreach ($range as $code) {
                $label = match (true) {
                    $code === '?' => 'BELUM CULA',
                    $code === '0' => 'BELUM CULA',
                    $code === 1 => 'UMNO',
                    $code === 2 => 'PAS',
                    $code === 3 => 'PAS LUAR',
                    $code === 4 => 'ATAS PAGAR',
                    $code === 5 => 'PKR',
                    $code === 6 => 'DHPP',
                    $code === 7 => 'TIDAK DIKENALI',
                    $code === 8 => 'MATI',
                    $code === 9 => 'PAN DAP',
                    $code === 10 => 'PPBM',
                    $code === 13 => 'MCA',
                    $code === '1A' => 'UMNO - SASARAN / LEMAH / ATAS PAGAR',
                    $code === '1B' => 'UMNO SOKONG PAS',
                    $code === '1P' => 'UMNO SOKONG PN (TIDAK SOKONG PAS)',
                    $code === '3B' => 'PAS LUAR KEDAH (BORNEO)',
                    $code === '3D' => 'PAS LUAR DUN',
                    $code === '3K' => 'PAS LUAR KEDAH (SEMENANJUNG)',
                    $code === '3M' => 'PAS LUAR MALAYSIA',
                    $code === '3P' => 'PAS LUAR PARLIMEN',
                    $code === '3U' => 'PAS LUAR UDM',
                    $code === '7P' => 'TIDAK DIKENALI (POLIS / TENTERA)',
                    $code === 97 => 'LAIN-LAIN BANGSA',
                    $code === 98 => 'INDIA',
                    $code === 99 => 'CINA',
                    default => null,
                };
                if ($label !== null) {
                    $codes[] = ['code' => (string) $code, 'label' => "$code - $label"];
                }
            }
        }

        return $codes;
    }
}
