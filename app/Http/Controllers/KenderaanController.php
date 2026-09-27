<?php

namespace App\Http\Controllers;

use App\Models\Cawangan;
use App\Models\Kenderaan;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class KenderaanController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $udms = $this->availableUdms($user);
        $scopedUdm = $this->scopedUdm($user);
        $requestedUdm = trim((string) $request->query('udm', ''));
        $selectedUdm = $scopedUdm ?? ($requestedUdm !== '' && in_array($requestedUdm, $udms, true) ? $requestedUdm : '');

        $vehicles = $this->visibleVehicles($user)
            ->when($selectedUdm !== '', fn (Builder $query) => $query->where('udm', $selectedUdm))
            ->orderBy('udm')
            ->orderBy('no_plate')
            ->get()
            ->map(fn (Kenderaan $kenderaan) => $this->serializeVehicle($kenderaan))
            ->values();

        $vehiclesByUdm = $vehicles->groupBy('udm');
        $displayUdms = $selectedUdm !== '' ? collect([$selectedUdm]) : collect($udms);

        return Inertia::render('Kenderaan/Index', [
            'vehicles' => $vehicles,
            'udms' => $udms,
            'udmSummaries' => $displayUdms
                ->map(fn (string $udm) => [
                    'udm' => $udm,
                    'count' => $vehiclesByUdm->get($udm, collect())->count(),
                    'vehicles' => $vehiclesByUdm->get($udm, collect())->values(),
                ])
                ->values(),
            'selectedUdm' => $selectedUdm,
            'defaultUdm' => $scopedUdm ?? '',
            'canSelectAll' => $scopedUdm === null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Kenderaan::query()->create($this->validateKenderaan($request, $request->user()));

        return to_route('kenderaan.index')->with('success', 'Kenderaan baharu berjaya ditambah.');
    }

    public function update(Request $request, Kenderaan $kenderaan): RedirectResponse
    {
        $this->ensureVisible($request->user(), $kenderaan);
        $kenderaan->update($this->validateKenderaan($request, $request->user(), $kenderaan));

        return to_route('kenderaan.index')->with('success', 'Kenderaan berjaya dikemas kini.');
    }

    public function destroy(Request $request, Kenderaan $kenderaan): RedirectResponse
    {
        $this->ensureVisible($request->user(), $kenderaan);
        $kenderaan->delete();

        return to_route('kenderaan.index')->with('success', 'Kenderaan berjaya dipadam.');
    }

    private function validateKenderaan(Request $request, User $user, ?Kenderaan $kenderaan = null): array
    {
        $request->merge([
            'udm' => trim((string) $request->input('udm')),
            'no_plate' => strtoupper(trim((string) $request->input('no_plate'))),
            'jenis_kenderaan' => trim((string) $request->input('jenis_kenderaan')),
        ]);

        $uniquePlate = Rule::unique('kenderaan', 'no_plate');
        if ($kenderaan) {
            $uniquePlate->ignore($kenderaan->id);
        }

        return $request->validate([
            'udm' => ['required', 'string', 'max:255', Rule::in($this->availableUdms($user))],
            'no_plate' => ['required', 'string', 'max:30', $uniquePlate],
            'jenis_kenderaan' => ['required', 'string', 'max:100'],
        ], [
            'udm.in' => 'UDM yang dipilih tidak berada dalam skop akses anda.',
            'no_plate.unique' => 'Nombor plat ini sudah didaftarkan.',
        ]);
    }

    private function ensureVisible(User $user, Kenderaan $kenderaan): void
    {
        abort_unless($this->visibleVehicles($user)->whereKey($kenderaan->id)->exists(), 403);
    }

    private function visibleVehicles(User $user): Builder
    {
        $query = Kenderaan::query();
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

        $vehicleQuery = Kenderaan::query()->select('udm')->distinct();
        if ($scopedUdm !== null) {
            $vehicleQuery->where('udm', $scopedUdm);
        }

        $cawanganQuery = Cawangan::query()->select('udm')->distinct();
        if ($scopedUdm !== null) {
            $cawanganQuery->where('udm', $scopedUdm);
        }

        return $udmQuery
            ->pluck('dm')
            ->merge($vehicleQuery->pluck('udm'))
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

    private function serializeVehicle(Kenderaan $kenderaan): array
    {
        return [
            'id' => $kenderaan->id,
            'udm' => $kenderaan->udm,
            'no_plate' => $kenderaan->no_plate,
            'jenis_kenderaan' => $kenderaan->jenis_kenderaan,
        ];
    }
}
