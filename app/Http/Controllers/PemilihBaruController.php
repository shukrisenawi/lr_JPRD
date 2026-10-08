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
        $month = (string) $request->query('bulan', $pemilihBaru->defaultMonth());

        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) !== 1) {
            $month = $pemilihBaru->defaultMonth();
        }

        $search = trim((string) $request->query('q', ''));
        $query = PemilihBaruRecord::query()->where('import_month', $month);
        $this->applyScope($query, $request);

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
                'birth_year' => $record->birth_year,
                'transaction' => $record->transaction,
                'no_rumah' => $record->no_rumah,
                'cula_code' => $record->cula_code,
                'cula_display_label' => $record->cula_display_label,
                'remark' => $record->remark,
                'linked_at' => $record->linked_at?->format('d-m-Y H:i'),
            ]);

        return Inertia::render('PemilihBaru/Index', [
            'filters' => [
                'bulan' => $month,
                'q' => $search,
            ],
            'month_options' => $pemilihBaru->monthOptions(),
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
        ]);

        $pemilihBaru->updateCula($pemilihBaruRecord, $validated['cula_code']);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Kod cula pemilih baharu berjaya dikemaskini.',
                'record_id' => $pemilihBaruRecord->id,
                'cula_code' => $validated['cula_code'],
            ]);
        }

        return redirect()
            ->route('pemilih-baru.index', ['bulan' => $pemilihBaruRecord->import_month])
            ->with('success', 'Kod cula pemilih baharu berjaya dikemaskini.');
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

    private function isWithinScope(PemilihBaruRecord $record, Request $request): bool
    {
        $scope = $request->user()?->accessScope();

        return $scope === null
            || ((! filled($scope['dm'] ?? null) || $record->dm === $scope['dm'])
                && (! filled($scope['locality'] ?? null) || $record->locality === $scope['locality']));
    }
}
