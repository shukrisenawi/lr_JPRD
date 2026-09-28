<?php

namespace App\Http\Controllers;

use App\Models\Cawangan;
use App\Models\Kenderaan;
use App\Models\PemilihRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
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
            'localitiesByUdm' => $this->availableLocalitiesByUdm($user, $udms),
        ]);
    }

    public function searchDrivers(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));

        if (mb_strlen($search) < 2) {
            return response()->json(['suggestions' => []]);
        }

        $keywords = array_values(array_filter(preg_split('/\s+/', mb_strtolower($search)) ?: []));
        $query = PemilihRecord::query()
            ->where(function (Builder $builder): void {
                $builder->where('status', 'aktif')
                    ->orWhere('is_manual', true);
            })
            ->where(function (Builder $builder) use ($keywords): void {
                foreach ($keywords as $keyword) {
                    $like = '%'.$keyword.'%';

                    $builder->where(function (Builder $subQuery) use ($keyword, $like): void {
                        $subQuery->whereRaw('LOWER(name) like ?', [$like])
                            ->orWhereRaw('LOWER(dm) like ?', [$like])
                            ->orWhereRaw('LOWER(locality) like ?', [$like]);

                        if (preg_match('/\d/', $keyword)) {
                            $digits = preg_replace('/\D+/', '', $keyword);
                            if ($digits !== '') {
                                $digitLike = '%'.$digits.'%';
                                $subQuery->orWhere('no_kp', 'like', $digitLike)
                                    ->orWhere('old_ic', 'like', $digitLike)
                                    ->orWhere('phone_home', 'like', $digitLike)
                                    ->orWhere('phone_mobile', 'like', $digitLike);
                            }
                        }
                    });
                }
            });
        $request->user()->applyScopeToPemilihQuery($query);
        $preferredUdm = trim((string) $request->query('udm', ''));
        if ($preferredUdm !== '') {
            $query->orderByRaw('CASE WHEN LOWER(dm) = LOWER(?) THEN 0 ELSE 1 END', [$preferredUdm]);
        }

        $suggestions = $query
            ->orderBy('name')
            ->limit(8)
            ->get([
                'id',
                'name',
                'no_kp',
                'old_ic',
                'phone_home',
                'phone_mobile',
                'dm',
                'locality',
                'status',
                'is_manual',
            ])
            ->map(fn (PemilihRecord $record) => [
                'id' => $record->id,
                'name' => $record->name,
                'no_kp' => $record->no_kp ?: $record->old_ic,
                'phone_home' => $record->phone_home,
                'phone_mobile' => $record->phone_mobile,
                'dm' => $record->dm,
                'locality' => $record->locality,
                'status' => $record->status,
                'is_manual' => $record->is_manual,
            ])
            ->values();

        return response()->json(['suggestions' => $suggestions]);
    }

    public function store(Request $request): RedirectResponse
    {
        Kenderaan::query()->create($this->validateKenderaan($request, $request->user()));

        return to_route('kenderaan.index', $this->udmRedirectParameters($request))->with('success', 'Kenderaan baharu berjaya ditambah.');
    }

    public function update(Request $request, Kenderaan $kenderaan): RedirectResponse
    {
        $this->ensureVisible($request->user(), $kenderaan);
        $kenderaan->update($this->validateKenderaan($request, $request->user(), $kenderaan));

        return to_route('kenderaan.index', $this->udmRedirectParameters($request))->with('success', 'Kenderaan berjaya dikemas kini.');
    }

    public function destroy(Request $request, Kenderaan $kenderaan): RedirectResponse
    {
        $this->ensureVisible($request->user(), $kenderaan);
        $kenderaan->delete();

        return to_route('kenderaan.index', $this->udmRedirectParameters($request))->with('success', 'Kenderaan berjaya dipadam.');
    }

    private function udmRedirectParameters(Request $request): array
    {
        $redirectUdm = trim((string) $request->query('udm', ''));

        if ($redirectUdm === '') {
            $redirectUdm = trim((string) $request->input('_redirect_udm', ''));
        }

        return $redirectUdm !== '' ? ['udm' => $redirectUdm] : [];
    }

    private function validateKenderaan(Request $request, User $user, ?Kenderaan $kenderaan = null): array
    {
        $request->merge([
            'udm' => trim((string) $request->input('udm')),
            'no_plate' => strtoupper(trim((string) $request->input('no_plate'))),
            'jenis_kenderaan' => trim((string) $request->input('jenis_kenderaan')) ?: null,
            'nama_pemandu' => trim((string) $request->input('nama_pemandu')) ?: null,
            'no_tel' => trim((string) $request->input('no_tel')) ?: null,
            'lokaliti' => trim((string) $request->input('lokaliti')) ?: null,
        ]);

        $uniquePlate = Rule::unique('kenderaan', 'no_plate');
        if ($kenderaan) {
            $uniquePlate->ignore($kenderaan->id);
        }

        return $request->validate([
            'udm' => ['required', 'string', 'max:255', Rule::in($this->availableUdms($user))],
            'no_plate' => ['required', 'string', 'max:30', $uniquePlate],
            'jenis_kenderaan' => ['nullable', 'string', 'max:100'],
            'nama_pemandu' => ['nullable', 'string', 'max:255'],
            'no_tel' => ['nullable', 'string', 'max:30'],
            'lokaliti' => ['nullable', 'string', 'max:255'],
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

    private function availableLocalitiesByUdm(User $user, array $udms): array
    {
        $localitiesByUdm = collect($udms)->mapWithKeys(fn (string $udm) => [$udm => collect()]);
        $addLocality = function (?string $udm, ?string $locality) use ($localitiesByUdm): void {
            $udm = trim((string) $udm);
            $locality = trim((string) $locality);

            if ($udm === '' || $locality === '' || $locality === '-') {
                return;
            }

            $localitiesByUdm->get($udm, collect())->push($locality);
        };

        $pemilihQuery = PemilihRecord::query()
            ->where(function (Builder $query): void {
                $query->where('status', 'aktif')
                    ->orWhere('is_manual', true);
            })
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->where('dm', '!=', '-')
            ->whereNotNull('locality')
            ->where('locality', '!=', '');
        $user->applyScopeToPemilihQuery($pemilihQuery);

        $pemilihQuery->get(['dm', 'locality'])->each(fn (PemilihRecord $record) => $addLocality($record->dm, $record->locality));

        $vehicleQuery = $this->visibleVehicles($user)
            ->whereIn('udm', $udms)
            ->whereNotNull('lokaliti')
            ->where('lokaliti', '!=', '');
        $vehicleQuery->get(['udm', 'lokaliti'])->each(fn (Kenderaan $kenderaan) => $addLocality($kenderaan->udm, $kenderaan->lokaliti));

        return $localitiesByUdm
            ->map(fn ($localities) => $localities->unique()->sort()->values()->all())
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
            'nama_pemandu' => $kenderaan->nama_pemandu,
            'no_tel' => $kenderaan->no_tel,
            'lokaliti' => $kenderaan->lokaliti,
        ];
    }
}
