<?php

namespace App\Http\Controllers;

use App\Models\Aktiviti;
use App\Models\Setting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AktivitiController extends Controller
{
    private const PASSWORD_KEY = 'aktiviti_public_password_hash';

    private const TOKEN_KEY = 'aktiviti_public_token';

    private const ACCESS_SESSION_KEY = 'aktiviti_public_password_hash';

    private const TIMEZONE = 'Asia/Kuala_Lumpur';

    public function index(): Response
    {
        $upcoming = $this->upcomingQuery()->get();
        $past = $this->pastQuery()->get();

        return Inertia::render('Aktiviti/Index', [
            'upcomingActivities' => $upcoming
                ->map(fn (Aktiviti $aktiviti) => $this->serializeActivity($aktiviti))
                ->values(),
            'pastActivities' => $past
                ->map(fn (Aktiviti $aktiviti) => $this->serializeActivity($aktiviti))
                ->values(),
            'publicLink' => route('aktiviti.public', ['token' => $this->publicToken()]),
            'hasPublicPassword' => filled(Setting::valueOf(self::PASSWORD_KEY)),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateActivity($request);

        Aktiviti::query()->create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return to_route('aktiviti.index')->with('success', 'Aktiviti baharu berjaya ditambah.');
    }

    public function update(Request $request, Aktiviti $aktiviti): RedirectResponse
    {
        $aktiviti->update($this->validateActivity($request));

        return to_route('aktiviti.index')->with('success', 'Aktiviti berjaya dikemas kini.');
    }

    public function destroy(Aktiviti $aktiviti): RedirectResponse
    {
        $aktiviti->delete();

        return to_route('aktiviti.index')->with('success', 'Aktiviti berjaya dipadam.');
    }

    public function updatePublicPassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'min:6', 'max:72', 'confirmed'],
        ], [
            'password.confirmed' => 'Pengesahan password tidak sepadan.',
            'password.min' => 'Password mestilah sekurang-kurangnya :min aksara.',
        ]);

        Setting::setValue(self::PASSWORD_KEY, Hash::make($validated['password']));

        return back()->with('success', 'Password pautan awam berjaya ditetapkan.');
    }

    public function publicIndex(Request $request, string $token): Response
    {
        abort_unless($this->tokenIsValid($token), 404);

        $passwordHash = Setting::valueOf(self::PASSWORD_KEY);
        $sessionHash = $request->session()->get(self::ACCESS_SESSION_KEY);
        $hasAccess = filled($passwordHash)
            && filled($sessionHash)
            && hash_equals((string) $passwordHash, (string) $sessionHash);

        return Inertia::render('Aktiviti/Public', [
            'token' => $token,
            'hasAccess' => $hasAccess,
            'passwordConfigured' => filled($passwordHash),
            'activities' => $hasAccess
                ? $this->upcomingQuery()
                    ->get()
                    ->map(fn (Aktiviti $aktiviti) => $this->serializeActivity($aktiviti))
                    ->values()
                : collect(),
        ]);
    }

    public function publicAccess(Request $request, string $token): RedirectResponse
    {
        abort_unless($this->tokenIsValid($token), 404);

        $validated = $request->validate([
            'password' => ['required', 'string', 'max:72'],
        ]);
        $passwordHash = Setting::valueOf(self::PASSWORD_KEY);

        if (blank($passwordHash) || ! Hash::check($validated['password'], $passwordHash)) {
            return back()->withErrors(['password' => 'Password tidak tepat.']);
        }

        $request->session()->put(self::ACCESS_SESSION_KEY, (string) $passwordHash);

        return to_route('aktiviti.public', ['token' => $token]);
    }

    private function validateActivity(Request $request): array
    {
        $validated = $request->validate([
            'tajuk' => ['required', 'string', 'max:255'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'tarikh' => ['required', 'date_format:Y-m-d'],
            'masa' => ['required', 'date_format:H:i'],
            'tempat' => ['nullable', 'string', 'max:255'],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ]);

        foreach (['tajuk', 'kategori', 'tempat', 'catatan'] as $field) {
            if (array_key_exists($field, $validated) && is_string($validated[$field])) {
                $validated[$field] = trim($validated[$field]) ?: null;
            }
        }

        return $validated;
    }

    private function upcomingQuery(): Builder
    {
        [$today, $time] = $this->currentScheduleParts();

        return Aktiviti::query()
            ->where(function (Builder $query) use ($today, $time) {
                $query->whereDate('tarikh', '>', $today)
                    ->orWhere(function (Builder $sameDay) use ($today, $time) {
                        $sameDay
                            ->whereDate('tarikh', $today)
                            ->where('masa', '>=', $time);
                    });
            })
            ->orderBy('tarikh')
            ->orderBy('masa')
            ->orderBy('id');
    }

    private function pastQuery(): Builder
    {
        [$today, $time] = $this->currentScheduleParts();

        return Aktiviti::query()
            ->where(function (Builder $query) use ($today, $time) {
                $query->whereDate('tarikh', '<', $today)
                    ->orWhere(function (Builder $sameDay) use ($today, $time) {
                        $sameDay
                            ->whereDate('tarikh', $today)
                            ->where('masa', '<', $time);
                    });
            })
            ->orderByDesc('tarikh')
            ->orderByDesc('masa')
            ->orderByDesc('id');
    }

    private function currentScheduleParts(): array
    {
        $now = now(self::TIMEZONE);

        return [$now->toDateString(), $now->format('H:i:s')];
    }

    private function serializeActivity(Aktiviti $aktiviti): array
    {
        $date = $aktiviti->tarikh?->copy()->locale('ms');
        $time = $this->formatTime($aktiviti->masa);

        return [
            'id' => $aktiviti->id,
            'tajuk' => $aktiviti->tajuk,
            'kategori' => $aktiviti->kategori,
            'tarikh' => $aktiviti->tarikh?->format('Y-m-d'),
            'tarikh_label' => $date?->isoFormat('dddd, D MMMM YYYY'),
            'tarikh_hari' => $date?->format('d'),
            'tarikh_bulan' => $date ? Str::upper($date->isoFormat('MMM')) : null,
            'masa' => $time,
            'tempat' => $aktiviti->tempat,
            'catatan' => $aktiviti->catatan,
        ];
    }

    private function formatTime(?string $time): ?string
    {
        return filled($time) ? substr((string) $time, 0, 5) : null;
    }

    private function publicToken(): string
    {
        $token = Setting::valueOf(self::TOKEN_KEY);

        if (filled($token)) {
            return (string) $token;
        }

        $token = Str::random(48);
        Setting::setValue(self::TOKEN_KEY, $token);

        return $token;
    }

    private function tokenIsValid(string $token): bool
    {
        $storedToken = Setting::valueOf(self::TOKEN_KEY);

        return filled($storedToken) && hash_equals((string) $storedToken, $token);
    }
}
