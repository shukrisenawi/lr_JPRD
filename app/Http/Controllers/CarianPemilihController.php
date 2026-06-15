<?php

namespace App\Http\Controllers;

use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Models\CulaWorkItem;
use App\Services\ImageService;
use App\Services\PemilihReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CarianPemilihController extends Controller
{
    public function index(): Response
    {
        $user = request()->user();
        $base = PemilihRecord::query()->where('status', 'aktif');

        $user?->applyScopeToPemilihQuery($base);

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

        $localitiesByDm = (clone $base)
            ->whereNotNull('dm')
            ->where('dm', '!=', '')
            ->where('dm', '!=', '-')
            ->whereNotNull('locality')
            ->where('locality', '!=', '')
            ->where('locality', '!=', '-')
            ->select('dm', 'locality')
            ->distinct()
            ->orderBy('locality')
            ->get()
            ->groupBy('dm')
            ->map(fn ($items) => $items->pluck('locality')->values()->all())
            ->all();

        return Inertia::render('CarianPemilih', [
            'available_cula_codes' => $this->availableCulaCodes(),
            'available_dms' => $availableDms,
            'localities_by_dm' => $localitiesByDm,
        ]);
    }

    private function availableCulaCodes(): array
    {
        $query = PemilihRecord::query()
            ->where('status', 'aktif')
            ->whereNotNull('cula_code')
            ->where('cula_code', '!=', '')
            ->where('cula_code', '!=', '?')
            ->where('cula_code', '!=', 'TIADA');

        request()->user()?->applyScopeToPemilihQuery($query);

        return $query
            ->select('cula_code', DB::raw('MAX(cula_display_label) as display_label'))
            ->groupBy('cula_code')
            ->orderBy('cula_code')
            ->get()
            ->map(fn ($r) => [
                'code' => $r->cula_code,
                'label' => $r->display_label,
            ])
            ->values()
            ->all();
    }

    public function search(Request $request, PemilihReportService $reportService)
    {
        $path = Setting::valueOf('pemilih_report_file_path', PemilihReportService::DEFAULT_SAMPLE_PATH);

        return response()->json([
            'suggestions' => $reportService->searchVoters(
                (string) $request->query('q', ''),
                $path,
                8,
                $request->user(),
                $request->query('dm', '') ?: null,
                $request->query('locality', '') ?: null,
            ),
        ]);
    }

    public function updateNoAhli(Request $request)
    {
        $user = $request->user();
        if (!$user->canAccessModule('kemaskini-no-ahli')) {
            abort(403, 'Anda tidak mempunyai akses untuk mengemaskini No. Ahli.');
        }

        $validated = $request->validate([
            'record_id' => 'required|integer|exists:pemilih_records,id',
            'no_ahli' => 'nullable|string|max:255',
        ]);

        $record = PemilihRecord::findOrFail($validated['record_id']);
        $record->no_ahli = $validated['no_ahli'];
        $record->save();

        return response()->json([
            'success' => true,
            'message' => 'No. Ahli berjaya dikemaskini.',
        ]);
    }

    public function uploadAvatar(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        $validated = $request->validate([
            'avatar' => ['required', 'image', 'max:2048'],
        ]);

        if ($pemilihRecord->avatar) {
            Storage::disk('public')->delete($pemilihRecord->avatar);
        }

        $pemilihRecord->avatar = ImageService::resizeIfNeeded($request->file('avatar'), 'pemilih-avatars');
        $pemilihRecord->save();

        return response()->json([
            'success' => true,
            'avatar_url' => $pemilihRecord->avatarUrl(),
        ]);
    }

    public function updateCula(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        $request->validate([
            'cula_code' => 'required|string',
            'cula_display_label' => 'required|string',
        ]);

        $pemilihRecord->update([
            'cula_code' => $request->input('cula_code'),
            'cula_display_label' => $request->input('cula_display_label'),
        ]);

        CulaWorkItem::query()->firstOrCreate(
            ['pemilih_record_id' => $pemilihRecord->id],
            [
                'marked_by' => $request->user()->id,
                'marked_at' => now(),
                'notes' => null,
            ]
        );

        return response()->json([
            'message' => 'Kod culaan dikemaskini.',
            'voter_id' => $pemilihRecord->id,
        ]);
    }

    public function avatar(Request $request, PemilihRecord $pemilihRecord)
    {
        abort_unless($pemilihRecord->avatar, 404);
        abort_unless(Storage::disk('public')->exists($pemilihRecord->avatar), 404);

        return response()->file(
            Storage::disk('public')->path($pemilihRecord->avatar),
            [
                'Cache-Control' => 'private, max-age=3600',
            ],
        );
    }
}
