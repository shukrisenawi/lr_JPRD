<?php

namespace App\Http\Controllers;

use App\Models\CulaWorkItem;
use App\Models\PemilihRecord;
use App\Models\Setting;
use App\Services\ImageService;
use App\Services\PemilihReportService;
use App\Support\CulaCodes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CarianPemilihController extends Controller
{
    public function index(): Response
    {
        $user = request()->user();
        $base = PemilihRecord::query()->where('status', 'aktif')->where('is_manual', false);

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
        return CulaCodes::options();
    }

    public function search(Request $request, PemilihReportService $reportService)
    {
        $path = Setting::valueOf('pemilih_report_file_path', PemilihReportService::DEFAULT_SAMPLE_PATH);

        $culaCodes = $request->query('cula_codes', []);
        if (is_string($culaCodes)) {
            $culaCodes = array_filter(explode(',', $culaCodes));
        }

        return response()->json([
            'suggestions' => $reportService->searchVoters(
                (string) $request->query('q', ''),
                $path,
                8,
                $request->user(),
                $request->query('dm', '') ?: null,
                $request->query('locality', '') ?: null,
                $culaCodes ?: null,
            ),
        ]);
    }

    public function updateNoAhli(Request $request)
    {
        $user = $request->user();
        if (! $user->canAccessModule('kemaskini-no-ahli')) {
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
            'avatar' => ['required', 'image', 'max:10240'],
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

    public function uploadBirthdayImage(Request $request, PemilihRecord $pemilihRecord): JsonResponse
    {
        $validated = $request->validate([
            'birthday_image' => ['required', 'image', 'max:10240'],
        ]);

        if ($pemilihRecord->birthday_image) {
            Storage::disk('public')->delete($pemilihRecord->birthday_image);
        }

        $pemilihRecord->birthday_image = ImageService::resizeIfNeeded($request->file('birthday_image'), 'pemilih-birthday-images');
        $pemilihRecord->save();

        return response()->json([
            'success' => true,
            'birthday_image_url' => $pemilihRecord->birthdayImageUrl(),
        ]);
    }

    public function destroyBirthdayImage(PemilihRecord $pemilihRecord): JsonResponse
    {
        if ($pemilihRecord->birthday_image) {
            Storage::disk('public')->delete($pemilihRecord->birthday_image);
        }

        $pemilihRecord->birthday_image = null;
        $pemilihRecord->save();

        return response()->json(['success' => true]);
    }

    public function birthdayImage(Request $request, PemilihRecord $pemilihRecord)
    {
        abort_unless($pemilihRecord->birthday_image, 404);
        abort_unless(Storage::disk('public')->exists($pemilihRecord->birthday_image), 404);

        return response()->file(
            Storage::disk('public')->path($pemilihRecord->birthday_image),
            [
                'Cache-Control' => 'private, max-age=3600',
            ],
        );
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
