<?php

namespace App\Http\Controllers;

use App\Models\Program;
use App\Models\ProgramAttendee;
use App\Models\CommitteeMembership;
use App\Models\PemilihRecord;
use App\Models\ProgramGroup;
use App\Models\ProgramSubProgram;
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
            ->orderBy('name')
            ->get();
        $programs = $this->accessibleProgramsQuery($user->id)
            ->with(['attendees.subPrograms', 'sharedUsers:id,name', 'group', 'subPrograms'])
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
        $committeeBadges = $selectedProgram
            ? $this->buildCommitteeBadgeMap($selectedProgram->attendees)
            : collect();

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
                    'sub_programs' => $selectedProgram->subPrograms
                        ->map(fn (ProgramSubProgram $sp) => [
                            'id' => $sp->id,
                            'name' => $sp->name,
                            'color' => $sp->color,
                        ])
                        ->values(),
                    'attendees' => $selectedProgram->attendees
                        ->map(fn (ProgramAttendee $attendee) => [
                            'id' => $attendee->id,
                            'voter_id' => $attendee->voter_id,
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
                            'committee_badges' => $committeeBadges->get($attendee->id, []),
                            'joined_programs' => $attendeePrograms->get($attendee->voter_id, collect())->all(),
                            'sub_program_ids' => $attendee->subPrograms->pluck('id')->all(),
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
            'sub_program_ids' => ['nullable', 'array'],
            'sub_program_ids.*' => ['integer', 'exists:program_sub_programs,id'],
        ]);

        $subProgramIds = $validated['sub_program_ids'] ?? [];

        $attendee = $program->attendees()->updateOrCreate(
            ['voter_id' => $validated['voter_id']],
            [
                ...$validated,
                'attended_at' => now(),
            ],
        );

        $attendee->subPrograms()->sync($subProgramIds);

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

    public function laporan(Request $request, Program $program): Response
    {
        $this->ensureAccessible($request->user()->id, $program);

        $attendees = $program->attendees;
        $total = $attendees->count();

        $byDm = $attendees
            ->groupBy(fn ($a) => $a->dm ?: 'Tiada')
            ->map(fn ($group, $dm) => [
                'name' => $dm,
                'key' => $dm,
                'total' => $group->count(),
            ])
            ->sortByDesc('total')
            ->values();

        $byLocality = $attendees
            ->groupBy(fn ($a) => $a->locality ?: 'Tiada')
            ->map(fn ($group, $loc) => [
                'name' => $loc,
                'total' => $group->count(),
            ])
            ->sortByDesc('total')
            ->values();

        $gender = collect([
            ['key' => 'L', 'label' => 'Lelaki', 'total' => $attendees->where('gender', 'L')->count()],
            ['key' => 'P', 'label' => 'Perempuan', 'total' => $attendees->where('gender', 'P')->count()],
            ['key' => 'X', 'label' => 'Tiada', 'total' => $attendees->filter(fn ($a) => ! in_array($a->gender, ['L', 'P']))->count()],
        ])->filter(fn ($g) => $g['total'] > 0)->values();

        $race = $attendees
            ->groupBy(fn ($a) => $a->race ?: 'Tiada')
            ->map(fn ($group, $race) => [
                'code' => $race,
                'label' => $race,
                'total' => $group->count(),
            ])
            ->sortByDesc('total')
            ->values();

        $byCula = $attendees
            ->groupBy(fn ($a) => $a->cula_code ?: '?')
            ->map(fn ($group, $code) => [
                'code' => (string) $code,
                'display_label' => $group->first()->cula_display_label ?: ($code === '?' ? 'Belum Dicula' : $code),
                'total' => $group->count(),
            ])
            ->sortByDesc('total')
            ->values();

        $dmDetails = $byDm->map(function ($dm) use ($attendees) {
            $filtered = $attendees->where('dm', $dm['key'] === 'Tiada' ? null : $dm['key']);
            $localities = $filtered
                ->groupBy(fn ($a) => $a->locality ?: 'Tiada')
                ->map(fn ($g, $loc) => [
                    'name' => $loc,
                    'total' => $g->count(),
                    'with_cula' => $g->filter(fn ($a) => $a->cula_code && $a->cula_code !== '?')->count(),
                    'belum_dicula' => $g->filter(fn ($a) => ! $a->cula_code || $a->cula_code === '?')->count(),
                ])
                ->sortByDesc('total')
                ->values();

            return [
                'key' => $dm['key'],
                'name' => $dm['name'],
                'total' => $dm['total'],
                'localities' => $localities,
                'summary' => [
                    'total_voters' => $dm['total'],
                    'total_localities' => $localities->count(),
                    'with_cula' => $filtered->filter(fn ($a) => $a->cula_code && $a->cula_code !== '?')->count(),
                    'belum_dicula' => $filtered->filter(fn ($a) => ! $a->cula_code || $a->cula_code === '?')->count(),
                ],
            ];
        });

        $raceByDm = $byDm->map(fn ($dm) => [
            'key' => $dm['key'],
            'items' => $attendees
                ->where('dm', $dm['key'] === 'Tiada' ? null : $dm['key'])
                ->groupBy(fn ($a) => $a->race ?: 'Tiada')
                ->map(fn ($g, $race) => ['code' => $race, 'label' => $race, 'total' => $g->count()])
                ->sortByDesc('total')
                ->values(),
        ]);

        $genderByDm = $byDm->map(fn ($dm) => [
            'key' => $dm['key'],
            'items' => collect([
                ['k' => 'L', 'l' => 'Lelaki', 't' => $attendees->where('dm', $dm['key'] === 'Tiada' ? null : $dm['key'])->where('gender', 'L')->count()],
                ['k' => 'P', 'l' => 'Perempuan', 't' => $attendees->where('dm', $dm['key'] === 'Tiada' ? null : $dm['key'])->where('gender', 'P')->count()],
            ])->filter(fn ($g) => $g['t'] > 0)->values(),
        ]);

        $culaByDm = $byDm->map(fn ($dm) => [
            'key' => $dm['key'],
            'cula_breakdown' => $attendees
                ->where('dm', $dm['key'] === 'Tiada' ? null : $dm['key'])
                ->groupBy(fn ($a) => $a->cula_code ?: '?')
                ->map(fn ($g, $code) => [
                    'code' => (string) $code,
                    'display_label' => $g->first()->cula_display_label ?: ($code === '?' ? 'Belum Dicula' : $code),
                    'total' => $g->count(),
                ])
                ->sortByDesc('total')
                ->values(),
        ]);

        return Inertia::render('Program/Laporan', [
            'program' => [
                'id' => $program->id,
                'tajuk' => $program->tajuk,
                'tempat' => $program->tempat,
                'tarikh' => $program->tarikh?->format('d-m-Y'),
                'masa' => $program->masa?->format('h:i A'),
                'group_name' => $program->group?->name,
                'attendees_count' => $total,
            ],
            'report' => [
                'total' => $total,
                'total_dm' => $byDm->count(),
                'total_localities' => $byLocality->count(),
                'summary' => [
                    'total_voters' => $total,
                    'total_dm' => $byDm->count(),
                    'total_localities' => $byLocality->count(),
                    'with_cula' => $attendees->filter(fn ($a) => $a->cula_code && $a->cula_code !== '?')->count(),
                    'belum_dicula' => $attendees->filter(fn ($a) => ! $a->cula_code || $a->cula_code === '?')->count(),
                ],
                'by_dm' => $byDm,
                'by_locality' => $byLocality,
                'gender' => $gender,
                'race' => $race,
                'by_cula' => $byCula,
                'dm_details' => $dmDetails,
                'race_by_dm' => $raceByDm,
                'gender_by_dm' => $genderByDm,
                'cula_by_dm' => $culaByDm,
            ],
        ]);
    }

    public function storeSubProgram(Request $request, Program $program): RedirectResponse
    {
        $this->ensureOwner($request->user()->id, $program);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $program->subPrograms()->create($validated);

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Sub program berjaya ditambah.');
    }

    public function updateSubProgram(Request $request, ProgramSubProgram $subProgram): RedirectResponse
    {
        $program = $subProgram->program;
        $this->ensureOwner($request->user()->id, $program);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $subProgram->update($validated);

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Sub program berjaya dikemas kini.');
    }

    public function destroySubProgram(Request $request, ProgramSubProgram $subProgram): RedirectResponse
    {
        $program = $subProgram->program;
        $this->ensureOwner($request->user()->id, $program);

        $subProgram->delete();

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Sub program berjaya dipadam.');
    }

    public function updateAttendeeSubPrograms(Request $request, Program $program, ProgramAttendee $attendee): RedirectResponse
    {
        $this->ensureAccessible($request->user()->id, $program);

        if ($attendee->program_id !== $program->id) {
            throw (new ModelNotFoundException)->setModel(ProgramAttendee::class, [$attendee->id]);
        }

        $validated = $request->validate([
            'sub_program_ids' => ['nullable', 'array'],
            'sub_program_ids.*' => ['integer', 'exists:program_sub_programs,id'],
        ]);

        $attendee->subPrograms()->sync($validated['sub_program_ids'] ?? []);

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Sub program pemilih berjaya dikemas kini.');
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
                Rule::exists('program_groups', 'id'),
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

    private function buildCommitteeBadgeMap($attendees)
    {
        $identityNumbers = $attendees
            ->flatMap(fn (ProgramAttendee $attendee) => array_filter([
                $attendee->no_kp,
                $attendee->old_ic,
            ]))
            ->unique()
            ->values();

        if ($identityNumbers->isEmpty()) {
            return collect();
        }

        $voters = PemilihRecord::query()
            ->whereIn('identity_number', $identityNumbers)
            ->orWhereIn('no_kp', $identityNumbers)
            ->orWhereIn('old_ic', $identityNumbers)
            ->get();

        $membershipByVoterId = CommitteeMembership::query()
            ->with('position')
            ->whereIn('pemilih_record_id', $voters->pluck('id'))
            ->get()
            ->groupBy('pemilih_record_id');

        $voterByIdentity = collect();

        foreach ($voters as $voter) {
            foreach (array_filter([$voter->identity_number, $voter->no_kp, $voter->old_ic]) as $identity) {
                $voterByIdentity->put($identity, $voter);
            }
        }

        return $attendees->mapWithKeys(function (ProgramAttendee $attendee) use ($voterByIdentity, $membershipByVoterId) {
            $voter = $voterByIdentity->get($attendee->no_kp)
                ?? $voterByIdentity->get($attendee->old_ic);

            if (! $voter) {
                return [$attendee->id => []];
            }

            $badges = ($membershipByVoterId->get($voter->id) ?? collect())
                ->sortBy([
                    fn (CommitteeMembership $membership) => $membership->position?->sort_order ?? 9999,
                    fn (CommitteeMembership $membership) => $membership->position?->name ?? '',
                    fn (CommitteeMembership $membership) => $membership->scope_name,
                ])
                ->map(fn (CommitteeMembership $membership) => [
                    'label' => $membership->position?->name ?? 'Jawatan',
                    'level' => $membership->level,
                    'scope_name' => $membership->scope_name,
                    'parent_scope_name' => $membership->parent_scope_name,
                ])
                ->values()
                ->all();

            return [$attendee->id => $badges];
        });
    }
}
