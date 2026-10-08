<?php

namespace App\Http\Controllers;

use App\Models\PemilihBaruRecord;
use App\Services\PemilihBaruService;
use App\Support\CulaCodes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PemilihBaruController extends Controller
{
    public function index(Request $request, PemilihBaruService $pemilihBaru): Response
    {
        [$defaultYear, $defaultMonth] = explode('-', $pemilihBaru->defaultMonth());
        $month = (int) $request->query('bulan', $defaultMonth);
        $year = (int) $request->query('tahun', $defaultYear);

        if ($month < 1 || $month > 12 || $year < 1900 || $year > 2200) {
            $month = (int) $defaultMonth;
            $year = (int) $defaultYear;
        }

        $month = str_pad((string) $month, 2, '0', STR_PAD_LEFT);
        $importMonth = $year.'-'.$month;
        $showAllMonths = $request->has('semua_bulan')
            ? $request->boolean('semua_bulan')
            : true;
        $scope = $request->user()?->accessScope();
        $defaultUdm = filled($scope['dm'] ?? null) ? $scope['dm'] : '';
        $udm = trim((string) $request->query('udm', $defaultUdm));

        if ($defaultUdm !== '' && $udm !== $defaultUdm) {
            $udm = $defaultUdm;
        }

        $search = trim((string) $request->query('q', ''));
        $requestedLocality = trim((string) $request->query('locality', ''));
        $udms = $this->availableUdms($request);
        $monthQuery = PemilihBaruRecord::query()
            ->when(! $showAllMonths, fn (Builder $builder) => $builder->where('import_month', $importMonth));
        $this->applyScope($monthQuery, $request);

        $summaryRows = (clone $monthQuery)
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->select('dm')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN cula_code IS NOT NULL AND cula_code != '' AND cula_code NOT IN ('0', '?', 'TIADA') THEN 1 ELSE 0 END) as completed")
            ->selectRaw("SUM(CASE WHEN remark = 'Dah link' THEN 1 ELSE 0 END) as linked")
            ->groupBy('dm')
            ->get()
            ->keyBy('dm');

        $udmSummaries = collect($udms)
            ->map(fn (string $name) => [
                'key' => $name,
                'name' => $name,
                'total' => (int) ($summaryRows[$name]->total ?? 0),
                'completed' => (int) ($summaryRows[$name]->completed ?? 0),
                'linked' => (int) ($summaryRows[$name]->linked ?? 0),
            ])
            ->values()
            ->all();

        $localities = $udm !== '' ? $this->availableLocalities($request, $udm) : [];
        $locality = in_array($requestedLocality, $localities, true) ? $requestedLocality : '';
        $query = clone $monthQuery;

        if ($udm === '') {
            $query->whereRaw('1 = 0');
        } else {
            $query->where('dm', $udm)
                ->when($locality !== '', fn (Builder $builder) => $builder->where('locality', $locality));
        }

        if ($search !== '') {
            $like = '%'.mb_strtolower($search).'%';
            $digits = preg_replace('/\D+/', '', $search) ?? '';
            $query->where(function (Builder $builder) use ($like, $digits): void {
                $builder->whereRaw('LOWER(name) like ?', [$like])
                    ->orWhereRaw('LOWER(dm) like ?', [$like])
                    ->orWhereRaw('LOWER(locality) like ?', [$like])
                    ->orWhereRaw('LOWER(transaction) like ?', [$like])
                    ->orWhereRaw('LOWER(no_kp) like ?', [$like])
                    ->orWhereRaw('LOWER(id_lain) like ?', [$like]);

                if ($digits !== '') {
                    $builder->orWhere('no_kp', 'like', '%'.$digits.'%')
                        ->orWhere('id_lain', 'like', '%'.$digits.'%');
                }
            });
        }

        $summaryQuery = clone $query;
        $total = (clone $summaryQuery)->count();
        $linked = (clone $summaryQuery)->where('remark', 'Dah link')->count();
        $completed = (clone $summaryQuery)
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '0')
            ->where('cula_code', '!=', '?')
            ->where('cula_code', '!=', 'TIADA')
            ->count();

        $records = $query
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (PemilihBaruRecord $record) => [
                'id' => $record->id,
                'name' => $record->name,
                'no_kp' => $record->no_kp,
                'id_lain' => $record->id_lain,
                'dm' => $record->dm,
                'locality' => $record->locality,
                'gender' => $record->gender,
                'race' => $record->race,
                'birth_year' => $record->birth_year,
                'umur' => $this->calculateAgeFromIdentity($record->no_kp)
                    ?? ($record->birth_year ? max(0, now()->year - $record->birth_year) : null),
                'transaction' => $record->transaction,
                'no_rumah' => $record->no_rumah,
                'cula_code' => $record->cula_code,
                'cula_display_label' => $record->cula_display_label,
                'remark' => $record->remark,
                'import_month' => $record->import_month,
                'linked_at' => $record->linked_at?->format('d-m-Y H:i'),
            ]);

        return Inertia::render('PemilihBaru/Index', [
            'filters' => [
                'udm' => $udm,
                'locality' => $locality,
                'bulan' => $month,
                'tahun' => (string) $year,
                'semua_bulan' => $showAllMonths,
                'q' => $search,
            ],
            'udms' => $udms,
            'udm_summaries' => $udmSummaries,
            'localities' => $localities,
            'requires_udm' => true,
            'month_options' => $pemilihBaru->monthOptions(),
            'year_options' => $pemilihBaru->yearOptions(),
            'summary' => [
                'total' => $total,
                'linked' => $linked,
                'completed' => $completed,
                'pending' => max(0, $total - $completed),
            ],
            'records' => $records,
            'available_cula_codes' => CulaCodes::options(),
        ]);
    }

    public function updateCula(Request $request, PemilihBaruRecord $pemilihBaruRecord, PemilihBaruService $pemilihBaru): RedirectResponse|JsonResponse
    {
        abort_unless($this->isWithinScope($pemilihBaruRecord, $request), 403);

        $validated = $request->validate([
            'cula_code' => ['required', 'string', Rule::in(array_column(CulaCodes::options(), 'code'))],
            'race' => ['required', 'string', Rule::in(['Melayu', 'Bukan Melayu'])],
        ]);

        $pemilihBaru->updateCula($pemilihBaruRecord, $validated['cula_code'], $validated['race']);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Kod cula pemilih baharu berjaya dikemaskini.',
                'record_id' => $pemilihBaruRecord->id,
                'cula_code' => $validated['cula_code'],
                'race' => $validated['race'],
            ]);
        }

        $redirectFilters = [
            'bulan' => substr($pemilihBaruRecord->import_month, 5, 2),
            'tahun' => substr($pemilihBaruRecord->import_month, 0, 4),
            'udm' => $request->input('udm'),
            'locality' => $request->input('locality'),
            'q' => $request->input('q'),
            'semua_bulan' => $request->has('semua_bulan')
                ? (int) $request->boolean('semua_bulan')
                : 1,
        ];

        return redirect()
            ->route('pemilih-baru.index', array_filter($redirectFilters, fn ($value) => $value !== null && $value !== ''))
            ->with('success', 'Kod cula pemilih baharu berjaya dikemaskini.');
    }

    private function availableUdms(Request $request): array
    {
        $query = PemilihBaruRecord::query()
            ->whereNotNull('dm')
            ->where('dm', '!=', '');
        $this->applyScope($query, $request);

        return $query
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->map(fn ($udm) => trim($udm))
            ->unique()
            ->values()
            ->all();
    }

    private function availableLocalities(Request $request, string $udm): array
    {
        $query = PemilihBaruRecord::query()
            ->where('dm', $udm)
            ->whereNotNull('locality')
            ->where('locality', '!=', '');
        $this->applyScope($query, $request);

        return $query
            ->select('locality')
            ->distinct()
            ->orderBy('locality')
            ->pluck('locality')
            ->map(fn ($locality) => trim($locality))
            ->unique()
            ->values()
            ->all();
    }

    private function applyScope(Builder $query, Request $request): void
    {
        $scope = $request->user()?->accessScope();

        if (filled($scope['dm'] ?? null)) {
            $query->where('dm', $scope['dm']);
        }

        if (filled($scope['locality'] ?? null)) {
            $query->where('locality', $scope['locality']);
        }
    }

    private function calculateAgeFromIdentity(?string $identity): ?int
    {
        $digits = preg_replace('/\D+/', '', (string) $identity) ?? '';

        if (strlen($digits) < 6) {
            return null;
        }

        $yearPart = (int) substr($digits, 0, 2);
        $month = (int) substr($digits, 2, 2);
        $day = (int) substr($digits, 4, 2);

        if (! checkdate($month, $day, 2000 + $yearPart)) {
            return null;
        }

        $now = now();
        $currentYearPart = (int) $now->format('y');
        $birthYear = $yearPart > $currentYearPart ? 1900 + $yearPart : 2000 + $yearPart;
        $age = $now->year - $birthYear;

        if ((int) $now->format('md') < (int) sprintf('%02d%02d', $month, $day)) {
            $age--;
        }

        return $age >= 0 ? $age : null;
    }

    private function isWithinScope(PemilihBaruRecord $record, Request $request): bool
    {
        $scope = $request->user()?->accessScope();

        return $scope === null
            || ((! filled($scope['dm'] ?? null) || $record->dm === $scope['dm'])
                && (! filled($scope['locality'] ?? null) || $record->locality === $scope['locality']));
    }
}
