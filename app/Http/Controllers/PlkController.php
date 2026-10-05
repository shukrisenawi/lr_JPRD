<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Support\CulaCodes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlkController extends Controller
{
    private const CULA_CODES = ['3B', '3D', '3K', '3M', '3P', '3U'];

    private const RATES_SETTING_KEY = 'plk_rates';

    public function index(Request $request): Response
    {
        $user = $request->user();
        $tab = $request->string('tab')->toString();
        $tab = in_array($tab, ['senarai', 'disemak', 'kos'], true) ? $tab : 'senarai';
        $filters = [
            'udm' => $request->string('udm')->trim()->toString(),
            'q' => $request->string('q')->trim()->toString(),
        ];
        $base = $this->baseQuery($user);

        $udmQuery = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->where('dm', '!=', '-');
        $user?->applyScopeToPemilihQuery($udmQuery);

        $udms = $udmQuery
            ->select('dm')
            ->distinct()
            ->orderBy('dm')
            ->pluck('dm')
            ->values()
            ->all();

        $rates = $this->rates();
        $summary = [
            'total' => (clone $base)->count(),
            'checked' => (clone $base)->whereNotNull('plk_verified_at')->count(),
            'pending' => (clone $base)->whereNull('plk_verified_at')->count(),
        ];
        $voters = null;
        $costRows = [];

        if ($tab !== 'kos') {
            $voterQuery = $this->applyFilters(clone $base, $filters)
                ->when($tab === 'disemak', fn (Builder $query) => $query->whereNotNull('plk_verified_at'));

            $voters = $voterQuery
                ->with('plkVerifier:id,name')
                ->select([
                    'id', 'no_kp', 'old_ic', 'name', 'dm', 'locality',
                    'cula_code', 'cula_display_label', 'phone_mobile', 'phone_home',
                    'plk_verified_at', 'plk_verified_by',
                ])
                ->orderBy('dm')
                ->orderBy('name')
                ->orderBy('id')
                ->paginate(30)
                ->withQueryString();

            $voters->getCollection()->transform(fn (PemilihRecord $voter) => [
                'id' => $voter->id,
                'name' => $voter->name,
                'no_kp' => $voter->no_kp,
                'telegram_identity' => $voter->no_kp ?: $voter->old_ic,
                'dm' => $voter->dm,
                'locality' => $voter->locality,
                'cula_code' => $voter->cula_code,
                'cula_label' => CulaCodes::label((string) $voter->cula_code),
                'phone' => $voter->phone_mobile ?: $voter->phone_home,
                'verified_at' => $voter->plk_verified_at?->format('d-m-Y H:i'),
                'verified_by' => $voter->plkVerifier?->name,
            ]);
        } else {
            $costRows = $this->costRows($base, $rates, $udms);
        }

        return Inertia::render('Plk/Index', [
            'active_tab' => $tab,
            'filters' => $filters,
            'udms' => $udms,
            'summary' => $summary,
            'voters' => $voters,
            'codes' => collect(self::CULA_CODES)->map(fn (string $code) => [
                'code' => $code,
                'label' => CulaCodes::label($code),
            ])->values()->all(),
            'rates' => $rates,
            'cost_rows' => $costRows,
        ]);
    }

    public function verify(Request $request, PemilihRecord $pemilihRecord): RedirectResponse
    {
        $record = $this->baseQuery($request->user())->findOrFail($pemilihRecord->id);

        if (! $record->plk_verified_at) {
            $record->forceFill([
                'plk_verified_at' => now(),
                'plk_verified_by' => $request->user()->id,
            ])->save();
        }

        return back()->with('success', 'Maklumat pemilih ditanda sebagai betul.');
    }

    public function updateRates(Request $request): RedirectResponse
    {
        $rules = ['rates' => ['required', 'array']];
        foreach (self::CULA_CODES as $code) {
            $rules['rates.'.$code] = ['required', 'numeric', 'min:0', 'max:1000000'];
        }

        $validated = $request->validate($rules);
        $rates = collect(self::CULA_CODES)
            ->mapWithKeys(fn (string $code) => [$code => round((float) $validated['rates'][$code], 2)])
            ->all();

        Setting::setValue(self::RATES_SETTING_KEY, json_encode($rates, JSON_THROW_ON_ERROR));

        return back()->with('success', 'Kadar bayaran PLK berjaya disimpan.');
    }

    private function baseQuery($user): Builder
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereIn('cula_code', self::CULA_CODES);

        $user?->applyScopeToPemilihQuery($query);

        return $query;
    }

    private function applyFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['udm'], fn (Builder $builder, string $udm) => $builder->where('dm', $udm))
            ->when($filters['q'], function (Builder $builder, string $search): void {
                $like = '%'.$search.'%';
                $builder->where(function (Builder $nested) use ($like): void {
                    $nested->where('name', 'like', $like)
                        ->orWhere('no_kp', 'like', $like)
                        ->orWhere('old_ic', 'like', $like)
                        ->orWhere('phone_mobile', 'like', $like)
                        ->orWhere('phone_home', 'like', $like)
                        ->orWhere('locality', 'like', $like);
                });
            });
    }

    private function rates(): array
    {
        $stored = json_decode((string) Setting::valueOf(self::RATES_SETTING_KEY, '{}'), true);
        $rates = array_fill_keys(self::CULA_CODES, 0);

        if (is_array($stored)) {
            foreach (self::CULA_CODES as $code) {
                if (isset($stored[$code]) && is_numeric($stored[$code]) && (float) $stored[$code] >= 0) {
                    $rates[$code] = round((float) $stored[$code], 2);
                }
            }
        }

        return $rates;
    }

    private function costRows(Builder $base, array $rates, array $udms): array
    {
        $grouped = [];

        foreach ($udms as $udm) {
            $grouped[$udm] = [
                'udm' => $udm,
                'counts' => array_fill_keys(self::CULA_CODES, 0),
                'amounts' => array_fill_keys(self::CULA_CODES, 0),
                'total' => 0,
            ];
        }

        (clone $base)
            ->select(['dm', 'cula_code'])
            ->selectRaw('COUNT(*) as quantity')
            ->groupBy('dm', 'cula_code')
            ->get()
            ->each(function ($record) use (&$grouped, $rates): void {
                $udm = trim((string) $record->dm);
                $udm = $udm !== '' && $udm !== '-' ? $udm : 'UDM TIDAK DINYATAKAN';
                $code = (string) $record->cula_code;

                if (! isset($grouped[$udm])) {
                    $grouped[$udm] = [
                        'udm' => $udm,
                        'counts' => array_fill_keys(self::CULA_CODES, 0),
                        'amounts' => array_fill_keys(self::CULA_CODES, 0),
                        'total' => 0,
                    ];
                }

                $quantity = (int) $record->quantity;
                $amount = round($quantity * (float) ($rates[$code] ?? 0), 2);
                $grouped[$udm]['counts'][$code] = $quantity;
                $grouped[$udm]['amounts'][$code] = $amount;
                $grouped[$udm]['total'] = round($grouped[$udm]['total'] + $amount, 2);
            });

        return collect($grouped)
            ->sortKeys()
            ->values()
            ->all();
    }
}
