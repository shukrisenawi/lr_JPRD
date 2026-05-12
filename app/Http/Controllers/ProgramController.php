<?php

namespace App\Http\Controllers;

use App\Models\Program;
use App\Models\ProgramAttendee;
use App\Models\ProgramGroup;
use App\Models\Setting;
use App\Models\User;
use App\Services\PemilihReportService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProgramController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $groups = ProgramGroup::query()
            ->where('user_id', $user->id)
            ->orderBy('name')
            ->get();
        $programs = $this->accessibleProgramsQuery($user->id)
            ->with(['attendees', 'sharedUsers:id,name', 'group'])
            ->latest('tarikh')
            ->latest('masa')
            ->latest('id')
            ->get();
        $attendeeGroupCounts = $programs
            ->flatMap(function (Program $program) {
                if (! $program->group?->name) {
                    return [];
                }

                return $program->attendees->map(fn (ProgramAttendee $attendee) => [
                    'voter_id' => $attendee->voter_id,
                    'group_name' => $program->group->name,
                ]);
            })
            ->groupBy('voter_id')
            ->map(function ($entries) {
                return collect($entries)
                    ->groupBy('group_name')
                    ->map(fn ($groupEntries, string $groupName) => [
                        'name' => $groupName,
                        'count' => count($groupEntries),
                    ])
                    ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                    ->values();
            });
        $attendeePrograms = $programs
            ->flatMap(function (Program $program) {
                return $program->attendees->map(fn (ProgramAttendee $attendee) => [
                    'voter_id' => $attendee->voter_id,
                    'program_id' => $program->id,
                    'tajuk' => $program->tajuk,
                    'tarikh' => $program->tarikh?->format('d-m-Y'),
                    'masa' => $program->masa?->format('h:i A'),
                    'group_name' => $program->group?->name,
                ]);
            })
            ->groupBy('voter_id')
            ->map(function ($entries) {
                return collect($entries)
                    ->unique('program_id')
                    ->sortByDesc('tarikh')
                    ->values();
            });

        $selectedProgramId = (int) $request->query('program', 0);
        $selectedProgram = $programs->firstWhere('id', $selectedProgramId);

        return Inertia::render('Program/Index', [
            'programs' => $programs
                ->map(fn (Program $program) => [
                    'id' => $program->id,
                    'tajuk' => $program->tajuk,
                    'tempat' => $program->tempat,
                    'tarikh' => $program->tarikh?->format('d-m-Y'),
                    'masa' => $program->masa?->format('h:i A'),
                    'group_id' => $program->group_id,
                    'group_name' => $program->group?->name,
                    'gambar_url' => $program->gambar ? route('program.gambar', $program) : null,
                    'attendees_count' => $program->attendees->count(),
                    'can_edit' => (int) $program->user_id === (int) $user->id,
                    'can_share' => (int) $program->user_id === (int) $user->id,
                    'shared_users' => $program->sharedUsers
                        ->map(fn (User $sharedUser) => [
                            'id' => $sharedUser->id,
                            'name' => $sharedUser->name,
                        ])
                        ->values(),
                ])
                ->values(),
            'selectedProgram' => $selectedProgram
                ? [
                    'id' => $selectedProgram->id,
                    'tajuk' => $selectedProgram->tajuk,
                    'tempat' => $selectedProgram->tempat,
                    'tarikh' => $selectedProgram->tarikh?->format('d-m-Y'),
                    'masa' => $selectedProgram->masa?->format('h:i A'),
                    'group_id' => $selectedProgram->group_id,
                    'group_name' => $selectedProgram->group?->name,
                    'gambar_url' => $selectedProgram->gambar ? route('program.gambar', $selectedProgram) : null,
                    'can_edit' => (int) $selectedProgram->user_id === (int) $user->id,
                    'can_share' => (int) $selectedProgram->user_id === (int) $user->id,
                    'shared_users' => $selectedProgram->sharedUsers
                        ->map(fn (User $sharedUser) => [
                            'id' => $sharedUser->id,
                            'name' => $sharedUser->name,
                        ])
                        ->values(),
                    'attendees' => $selectedProgram->attendees
                        ->map(fn (ProgramAttendee $attendee) => [
                            'id' => $attendee->id,
                            'name' => $attendee->name,
                            'no_kp' => $attendee->no_kp,
                            'old_ic' => $attendee->old_ic,
                            'phone_mobile' => $attendee->phone_mobile,
                            'phone_home' => $attendee->phone_home,
                            'dm' => $attendee->dm,
                            'locality' => $attendee->locality,
                            'gender' => $attendee->gender,
                            'race' => $attendee->race,
                            'cula_code' => $attendee->cula_code,
                            'cula_display_label' => $attendee->cula_display_label,
                            'address' => $attendee->address,
                            'group_badges' => $attendeeGroupCounts->get($attendee->voter_id, collect())->all(),
                            'joined_programs' => $attendeePrograms->get($attendee->voter_id, collect())->all(),
                            'attended_at' => $attendee->attended_at?->format('d-m-Y h:i A'),
                        ])
                        ->values(),
                ]
                : null,
            'groups' => $groups
                ->map(fn (ProgramGroup $group) => [
                    'id' => $group->id,
                    'name' => $group->name,
                    'programs_count' => $group->programs()->count(),
                ])
                ->values(),
            'shareableUsers' => User::query()
                ->whereKeyNot($user->id)
                ->get()
                ->filter(fn (User $candidate) => $candidate->canAccessModule('program'))
                ->map(fn (User $candidate) => [
                    'id' => $candidate->id,
                    'name' => $candidate->name,
                    'email' => $candidate->email,
                ])
                ->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateProgram($request);
        $gambarPath = $request->hasFile('gambar')
            ? $request->file('gambar')->store('programs', 'public')
            : null;

        $program = Program::query()->create([
            ...$validated,
            'gambar' => $gambarPath,
            'user_id' => $request->user()->id,
        ]);

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Program baharu berjaya ditambah.');
    }

    public function update(Request $request, Program $program): RedirectResponse
    {
        $this->ensureOwner($request->user()->id, $program);

        $validated = $this->validateProgram($request);
        $payload = [...$validated];

        if ($request->hasFile('gambar')) {
            if ($program->gambar) {
                Storage::disk('public')->delete($program->gambar);
            }

            $payload['gambar'] = $request->file('gambar')->store('programs', 'public');
        }

        $program->update($payload);

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Program berjaya dikemas kini.');
    }

    public function destroy(Program $program): RedirectResponse
    {
        $this->ensureOwner(request()->user()->id, $program);

        if ($program->gambar) {
            Storage::disk('public')->delete($program->gambar);
        }

        $program->delete();

        return redirect()
            ->route('program.index')
            ->with('success', 'Program berjaya dipadam.');
    }

    public function gambar(Program $program)
    {
        $this->ensureAccessible(request()->user()->id, $program);

        abort_unless($program->gambar, 404);
        abort_unless(Storage::disk('public')->exists($program->gambar), 404);

        return response()->file(
            Storage::disk('public')->path($program->gambar),
            [
                'Cache-Control' => 'private, max-age=3600',
            ],
        );
    }

    public function search(Request $request, Program $program, PemilihReportService $reportService)
    {
        $this->ensureAccessible($request->user()->id, $program);

        $path = Setting::valueOf('pemilih_report_file_path', PemilihReportService::DEFAULT_SAMPLE_PATH);

        return response()->json([
            'suggestions' => $reportService->searchVoters(
                (string) $request->query('q', ''),
                $path,
            ),
        ]);
    }

    public function storeAttendee(Request $request, Program $program): RedirectResponse
    {
        $this->ensureAccessible($request->user()->id, $program);

        $validated = $request->validate([
            'voter_id' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'no_kp' => ['nullable', 'string', 'max:50'],
            'old_ic' => ['nullable', 'string', 'max:50'],
            'phone_mobile' => ['nullable', 'string', 'max:50'],
            'phone_home' => ['nullable', 'string', 'max:50'],
            'dm' => ['nullable', 'string', 'max:255'],
            'locality' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:50'],
            'race' => ['nullable', 'string', 'max:50'],
            'cula_code' => ['nullable', 'string', 'max:50'],
            'cula_display_label' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
        ]);

        $program->attendees()->updateOrCreate(
            ['voter_id' => $validated['voter_id']],
            [
                ...$validated,
                'attended_at' => now(),
            ],
        );

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Pemilih berjaya direkodkan sebagai hadir program.');
    }

    public function destroyAttendee(Program $program, ProgramAttendee $attendee): RedirectResponse
    {
        $this->ensureAccessible(request()->user()->id, $program);

        if ($attendee->program_id !== $program->id) {
            throw (new ModelNotFoundException)->setModel(ProgramAttendee::class, [$attendee->id]);
        }

        $attendee->delete();

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Kehadiran pemilih berjaya dipadam.');
    }

    public function storeShare(Request $request, Program $program): RedirectResponse
    {
        $this->ensureOwner($request->user()->id, $program);

        $validated = $request->validate([
            'shared_user_ids' => ['nullable', 'array'],
            'shared_user_ids.*' => ['integer'],
        ]);

        $sharedUserIds = collect($validated['shared_user_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $shareableUserIds = User::query()
            ->get()
            ->filter(fn (User $candidate) => $candidate->canAccessModule('program'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id);

        abort_if($sharedUserIds->contains((int) $program->user_id), 422, 'Pemilik tidak perlu dikongsi.');
        abort_unless(
            $sharedUserIds->every(fn (int $id) => $shareableUserIds->contains($id)),
            422,
            'Terdapat pengguna dipilih yang tidak sah untuk perkongsian program.',
        );

        $program->sharedUsers()->sync($sharedUserIds->all());

        return back()->with('success', 'Perkongsian program berjaya dikemaskini.');
    }

    public function storeGroup(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        ProgramGroup::query()->create([
            'name' => $validated['name'],
            'user_id' => $request->user()->id,
        ]);

        return redirect()
            ->route('program.index')
            ->with('success', 'Group program berjaya ditambah.');
    }

    public function updateGroup(Request $request, ProgramGroup $group): RedirectResponse
    {
        $this->ensureGroupOwner($request->user()->id, $group);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $group->update([
            'name' => $validated['name'],
        ]);

        return redirect()
            ->route('program.index')
            ->with('success', 'Group program berjaya dikemaskini.');
    }

    public function destroyGroup(ProgramGroup $group): RedirectResponse
    {
        $this->ensureGroupOwner(request()->user()->id, $group);
        $group->delete();

        return redirect()
            ->route('program.index')
            ->with('success', 'Group program berjaya dipadam.');
    }

    private function validateProgram(Request $request): array
    {
        return $request->validate([
            'tajuk' => ['required', 'string', 'max:255'],
            'tempat' => ['required', 'string', 'max:255'],
            'tarikh' => ['required', 'date'],
            'masa' => ['nullable', 'date_format:H:i'],
            'group_id' => [
                'required',
                'integer',
                Rule::exists('program_groups', 'id')->where(
                    fn ($query) => $query->where('user_id', $request->user()->id),
                ),
            ],
            'gambar' => ['nullable', 'image', 'max:2048'],
        ]);
    }

    private function accessibleProgramsQuery(int $userId): Builder
    {
        return Program::query()->where(function (Builder $query) use ($userId) {
            $query->where('user_id', $userId)
                ->orWhereHas('sharedUsers', fn (Builder $sharedQuery) => $sharedQuery->whereKey($userId));
        });
    }

    private function ensureAccessible(int $userId, Program $program): void
    {
        abort_unless(
            (int) $program->user_id === $userId || $program->sharedUsers()->whereKey($userId)->exists(),
            403,
        );
    }

    private function ensureOwner(int $userId, Program $program): void
    {
        abort_unless((int) $program->user_id === $userId, 403);
    }

    private function ensureGroupOwner(int $userId, ProgramGroup $group): void
    {
        abort_unless((int) $group->user_id === $userId, 403);
    }
}
