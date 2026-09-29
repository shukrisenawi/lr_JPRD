<?php

namespace App\Http\Controllers;

use App\Models\Cawangan;
use App\Models\Dana;
use App\Models\DanaKategori;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DanaController extends Controller
{
    private const JENIS_OPTIONS = ['masuk', 'keluar'];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $udms = $this->availableUdms($user);
        $scopedUdm = $this->scopedUdm($user);
        $requestedUdm = trim((string) $request->query('udm', ''));
        $selectedUdm = $scopedUdm ?? ($requestedUdm !== '' && in_array($requestedUdm, $udms, true) ? $requestedUdm : '');
        $allDana = $this->visibleDana($user)
            ->with('kategori')
            ->orderBy('udm')
            ->orderByDesc('tarikh')
            ->orderByDesc('id')
            ->get();
        $danaByUdm = $allDana->groupBy('udm');
        $displayUdms = $selectedUdm !== '' ? collect([$selectedUdm]) : collect($udms);

        return Inertia::render('Dana/Index', [
            'dana' => $selectedUdm !== ''
                ? $danaByUdm->get($selectedUdm, collect())->map(fn (Dana $dana) => $this->serializeDana($dana))->values()
                : collect(),
            'udms' => $udms,
            'udmSummaries' => $displayUdms
                ->map(fn (string $udm) => $this->serializeSummary($udm, $danaByUdm->get($udm, collect())))
                ->values(),
            'selectedUdm' => $selectedUdm,
            'defaultUdm' => $scopedUdm ?? '',
            'canSelectAll' => $scopedUdm === null,
            'categories' => DanaKategori::query()
                ->withCount('dana')
                ->orderBy('is_other')
                ->orderBy('name')
                ->get()
                ->map(fn (DanaKategori $kategori) => [
                    'id' => $kategori->id,
                    'name' => $kategori->name,
                    'is_other' => (bool) $kategori->is_other,
                    'dana_count' => (int) $kategori->dana_count,
                ])
                ->values(),
            'canManageCategories' => $this->canManageCategories($user),
            'totals' => $this->serializeSummaryTotals($allDana),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Dana::query()->create([
            ...$this->validateDana($request, $request->user()),
            'created_by' => $request->user()->id,
        ]);

        return to_route('dana.index', $this->udmRedirectParameters($request))
            ->with('success', 'Rekod dana baharu berjaya ditambah.');
    }

    public function update(Request $request, Dana $dana): RedirectResponse
    {
        $this->ensureVisible($request->user(), $dana);
        $dana->update($this->validateDana($request, $request->user(), $dana));

        return to_route('dana.index', $this->udmRedirectParameters($request))
            ->with('success', 'Rekod dana berjaya dikemas kini.');
    }

    public function destroy(Request $request, Dana $dana): RedirectResponse
    {
        $this->ensureVisible($request->user(), $dana);
        $redirectParameters = $this->udmRedirectParameters($request);
        $dana->delete();

        return to_route('dana.index', $redirectParameters)
            ->with('success', 'Rekod dana berjaya dipadam.');
    }

    private function validateDana(Request $request, User $user, ?Dana $dana = null): array
    {
        $request->merge([
            'udm' => trim((string) $request->input('udm')),
            'jenis_dana_lain' => trim((string) $request->input('jenis_dana_lain')) ?: null,
            'jenis' => strtolower(trim((string) $request->input('jenis'))),
            'keterangan' => trim((string) $request->input('keterangan')),
            'catatan' => trim((string) $request->input('catatan')) ?: null,
        ]);
        $category = DanaKategori::query()->find($request->input('kategori_id'));

        $validated = $request->validate([
            'udm' => ['required', 'string', 'max:255', Rule::in($this->availableUdms($user))],
            'kategori_id' => ['required', 'integer', Rule::exists('dana_kategori', 'id')],
            'jenis_dana_lain' => ['nullable', 'string', 'max:255'],
            'jenis' => ['required', 'string', Rule::in(self::JENIS_OPTIONS)],
            'jumlah' => ['required', 'numeric', 'min:0.01', 'max:9999999999.99'],
            'tarikh' => ['required', 'date_format:Y-m-d'],
            'keterangan' => ['required', 'string', 'max:255'],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ], [
            'udm.in' => 'UDM yang dipilih tidak berada dalam skop akses anda.',
            'jenis.in' => 'Jenis transaksi mesti Masuk atau Keluar.',
            'jumlah.min' => 'Jumlah mestilah lebih besar daripada RM0.00.',
        ]);

        if ($category?->is_other && blank($validated['jenis_dana_lain'] ?? null)) {
            throw ValidationException::withMessages([
                'jenis_dana_lain' => 'Sila masukkan jenis dana untuk kategori Lain-lain.',
            ]);
        }

        if (! $category?->is_other) {
            $validated['jenis_dana_lain'] = null;
        }

        return $validated;
    }

    private function ensureVisible(User $user, Dana $dana): void
    {
        abort_unless($this->visibleDana($user)->whereKey($dana->id)->exists(), 403);
    }

    private function visibleDana(User $user): Builder
    {
        $query = Dana::query();
        $scopedUdm = $this->scopedUdm($user);

        if ($scopedUdm !== null) {
            $query->where('udm', $scopedUdm);
        }

        return $query;
    }

    private function availableUdms(User $user): array
    {
        $scope = $user->accessScope();
        $scopedUdm = $this->scopedUdm($user);
        $udmQuery = PemilihRecord::query()
            ->where('status', 'aktif')
            ->where('is_manual', false)
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->where('dm', '!=', '-');
        $user->applyScopeToPemilihQuery($udmQuery);

        $danaQuery = Dana::query()->select('udm')->distinct();
        if ($scopedUdm !== null) {
            $danaQuery->where('udm', $scopedUdm);
        }

        $cawanganQuery = Cawangan::query()->select('udm')->distinct();
        if ($scopedUdm !== null) {
            $cawanganQuery->where('udm', $scopedUdm);
        }

        return $udmQuery
            ->pluck('dm')
            ->merge($danaQuery->pluck('udm'))
            ->merge($cawanganQuery->pluck('udm'))
            ->push($scope['dm'] ?? null)
            ->map(fn ($udm) => trim((string) $udm))
            ->filter(fn (string $udm) => $udm !== '' && $udm !== '-')
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function scopedUdm(User $user): ?string
    {
        $scope = $user->accessScope();
        $udm = trim((string) ($scope['dm'] ?? ''));

        return $udm !== '' ? $udm : null;
    }

    private function canManageCategories(User $user): bool
    {
        return $user->isMasterAdmin()
            || in_array('dana.kategori', $user->role?->access_modules ?? [], true);
    }

    private function serializeSummary(string $udm, $records): array
    {
        return [
            'udm' => $udm,
            ...$this->serializeSummaryTotals($records),
        ];
    }

    private function serializeSummaryTotals($records): array
    {
        $masuk = $records->where('jenis', 'masuk')->sum(fn (Dana $dana) => (float) $dana->jumlah);
        $keluar = $records->where('jenis', 'keluar')->sum(fn (Dana $dana) => (float) $dana->jumlah);

        return [
            'count' => $records->count(),
            'total_masuk' => $this->formatAmount($masuk),
            'total_keluar' => $this->formatAmount($keluar),
            'baki' => $this->formatAmount($masuk - $keluar),
        ];
    }

    private function serializeDana(Dana $dana): array
    {
        return [
            'id' => $dana->id,
            'udm' => $dana->udm,
            'kategori_id' => $dana->kategori_id,
            'kategori' => $dana->kategori?->name,
            'kategori_is_other' => (bool) $dana->kategori?->is_other,
            'jenis_dana_lain' => $dana->jenis_dana_lain,
            'jenis' => $dana->jenis,
            'jumlah' => $this->formatAmount((float) $dana->jumlah),
            'tarikh' => $dana->tarikh?->format('Y-m-d'),
            'keterangan' => $dana->keterangan,
            'catatan' => $dana->catatan,
        ];
    }

    private function formatAmount(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }

    private function udmRedirectParameters(Request $request): array
    {
        $redirectUdm = trim((string) $request->query('udm', ''));

        if ($redirectUdm === '') {
            $redirectUdm = trim((string) $request->input('_redirect_udm', ''));
        }

        return $redirectUdm !== '' ? ['udm' => $redirectUdm] : [];
    }
}
