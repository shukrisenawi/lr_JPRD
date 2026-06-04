<?php

namespace App\Http\Controllers;

use App\Models\Program;
use App\Models\ProgramAttendee;
use App\Models\CommitteeMembership;
use App\Models\CommitteeGroup;
use App\Models\CulaWorkItem;
use App\Models\GroupPemilih;
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
        $committeeGroups = CommitteeGroup::query()
            ->with('positions')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
        $activeMemberships = CommitteeMembership::query()
            ->select('committee_position_id', 'level')
            ->distinct()
            ->get()
            ->groupBy('committee_position_id')
            ->map(fn ($items) => $items->pluck('level')->unique()->values()->all());
        $committeeGroupOptions = $committeeGroups
            ->flatMap(fn (CommitteeGroup $group) => 
                $group->levels
                    ? collect($group->levels)->filter(fn (string $level) =>
                        $group->positions->contains(fn ($pos) =>
                            isset($activeMemberships[$pos->id]) && in_array($level, $activeMemberships[$pos->id])
                        )
                    )->map(fn (string $level) => [
                        'value' => $group->id . ':' . $level,
                        'label' => $group->name . ' ' . ucfirst($level),
                    ])
                    : collect([['value' => $group->id . ':', 'label' => $group->name]])
            )
            ->values();
        $groupPemilihOptions = GroupPemilih::query()
            ->orderBy('sort_order')
            ->orderBy('nama_group')
            ->get(['id', 'nama_group']);
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
                    'sub_programs' => $attendee->subPrograms
                        ->map(fn ($sp) => $sp->name)
                        ->values(),
                ]);
            })
            ->groupBy('voter_id')
            ->map(function ($entries) {
                return collect($entries)
                    ->unique('program_id')
                    ->sortByDesc('tarikh')
                    ->values();
            });

        $subProgramCounts = $attendeePrograms->map(function ($entries) {
            return $entries
                ->flatMap(fn ($entry) => $entry['sub_programs'])
                ->countBy()
                ->all();
        });

        $selectedProgramId = (int) $request->query('program', 0);
        $selectedProgram = $programs->firstWhere('id', $selectedProgramId);

        $icToPemilihId = [];
        $icToNoAhli = [];
        if ($selectedProgram?->attendees) {
            $icNumbers = $selectedProgram->attendees
                ->pluck('no_kp')
                ->filter()
                ->unique()
                ->values()
                ->all();
            $oldIcs = $selectedProgram->attendees
                ->pluck('old_ic')
                ->filter()
                ->unique()
                ->values()
                ->all();
            $pemilihRecords = PemilihRecord::query()
                ->whereIn('no_kp', $icNumbers)
                ->orWhereIn('old_ic', $oldIcs)
                ->get(['id', 'no_kp', 'old_ic', 'no_ahli']);
            foreach ($pemilihRecords as $record) {
                if ($record->no_kp) {
                    $icToPemilihId[$record->no_kp] = $record->id;
                    $icToNoAhli[$record->no_kp] = $record->no_ahli;
                }
                if ($record->old_ic) {
                    $icToPemilihId[$record->old_ic] = $record->id;
                    $icToNoAhli[$record->old_ic] = $record->no_ahli;
                }
            }
        }
        $culaWorkItems = collect();
        if (! empty($icToPemilihId)) {
            $culaWorkItems = collect(CulaWorkItem::with('marker')
                ->whereIn('pemilih_record_id', array_values($icToPemilihId))
                ->get()
                ->keyBy('pemilih_record_id')
                ->all());
        }

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
                    'committee_group_filters' => $program->committee_group_filters,
                    'group_pemilih_filters' => $program->group_pemilih_filters,
                    'group_name' => $program->group?->name,
                    'has_laporan' => $program->has_laporan,
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
                    'committee_group_filters' => $selectedProgram->committee_group_filters,
                    'group_pemilih_filters' => $selectedProgram->group_pemilih_filters,
                    'group_name' => $selectedProgram->group?->name,
                    'has_laporan' => $selectedProgram->has_laporan,
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
                            'no_ahli' => $attendee->no_ahli ?? $icToNoAhli[$attendee->no_kp] ?? $icToNoAhli[$attendee->old_ic] ?? null,
                            'pemilih_record_id' => $icToPemilihId[$attendee->no_kp] ?? $icToPemilihId[$attendee->old_ic] ?? null,
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
                            'sub_program_counts' => $subProgramCounts->get($attendee->voter_id, []),
                            'attended_at' => $attendee->attended_at?->format('d-m-Y h:i A'),
                            'can_modify' => $user->isMasterAdmin()
                                || (int) $selectedProgram->user_id === (int) $user->id
                                || ((int) $attendee->user_id === (int) $user->id),
                            'is_marked' => $culaWorkItems->has($icToPemilihId[$attendee->no_kp] ?? $icToPemilihId[$attendee->old_ic] ?? null),
                            'marked_by_name' => $culaWorkItems->get($icToPemilihId[$attendee->no_kp] ?? $icToPemilihId[$attendee->old_ic] ?? null)?->marker?->name,
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
            'committeeGroupOptions' => $committeeGroupOptions,
            'groupPemilihOptions' => $groupPemilihOptions,
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
        $validated['committee_group_filters'] = $validated['committee_group_filters']
            ? [$validated['committee_group_filters']]
            : null;
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
        $validated['committee_group_filters'] = $validated['committee_group_filters']
            ? [$validated['committee_group_filters']]
            : null;
        $payload = [...$validated];

        if ($request->hasFile('gambar')) {
            if ($program->gambar) {
                Storage::disk('public')->delete($program->gambar);
            }

            $payload['gambar'] = $request->file('gambar')->store('programs', 'public');
        } else {
            unset($payload['gambar']);
        }

        $program->update($payload);

        return redirect()
            ->route('program.index')
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

    public function committeeMembers(Request $request, Program $program): JsonResponse
    {
        $this->ensureAccessible($request->user()->id, $program);

        $filter = $program->committee_group_filters;
        if (is_array($filter)) {
            $filter = $filter[0] ?? null;
        }
        if (! $filter) {
            return response()->json(['members' => []]);
        }

        [$groupId, $level] = explode(':', $filter) + [null, null];
        if (! $groupId) {
            return response()->json(['members' => []]);
        }

        $positionIds = CommitteeGroup::find((int) $groupId)
            ?->positions()
            ?->pluck('committee_positions.id') ?? collect();

        if ($positionIds->isEmpty()) {
            return response()->json(['members' => []]);
        }

        $memberships = CommitteeMembership::whereIn('committee_position_id', $positionIds)
            ->when($level, fn ($q) => $q->where('level', $level))
            ->with('voter')
            ->get()
            ->unique('pemilih_record_id')
            ->values();

        $members = $memberships->map(fn (CommitteeMembership $m) => [
            'pemilih_record_id' => $m->pemilih_record_id,
            'name' => $m->voter?->name,
            'no_kp' => $m->voter?->no_kp,
            'old_ic' => $m->voter?->old_ic,
            'phone_mobile' => $m->voter?->phone_mobile,
            'dm' => $m->voter?->dm,
            'locality' => $m->voter?->locality,
            'gender' => $m->voter?->gender,
            'race' => $m->voter?->race,
            'cula_code' => $m->voter?->cula_code,
            'cula_display_label' => $m->voter?->cula_display_label,
            'address' => $m->voter?->address,
            'scope_name' => $m->scope_name,
            'position_name' => $m->position?->name,
        ]);

        return response()->json(['members' => $members]);
    }

    public function storeBulkAttendees(Request $request, Program $program): RedirectResponse
    {
        $this->ensureAccessible($request->user()->id, $program);

        $validated = $request->validate([
            'members' => ['required', 'array', 'min:1'],
            'members.*.pemilih_record_id' => ['required', 'integer'],
            'members.*.name' => ['required', 'string', 'max:255'],
            'members.*.no_kp' => ['nullable', 'string', 'max:50'],
            'members.*.old_ic' => ['nullable', 'string', 'max:50'],
            'members.*.phone_mobile' => ['nullable', 'string', 'max:50'],
            'members.*.dm' => ['nullable', 'string', 'max:255'],
            'members.*.locality' => ['nullable', 'string', 'max:255'],
            'members.*.gender' => ['nullable', 'string', 'max:50'],
            'members.*.race' => ['nullable', 'string', 'max:50'],
            'members.*.cula_code' => ['nullable', 'string', 'max:50'],
            'members.*.cula_display_label' => ['nullable', 'string', 'max:255'],
            'members.*.address' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $count = 0;

        foreach ($validated['members'] as $member) {
            $voterId = $member['pemilih_record_id'];
            $existing = $program->attendees()->where('voter_id', (string) $voterId)->first();

            if ($existing) {
                $existing->update(['attended_at' => now()]);
            } else {
                $program->attendees()->create([
                    'voter_id' => (string) $voterId,
                    'name' => $member['name'],
                    'no_kp' => $member['no_kp'] ?? null,
                    'old_ic' => $member['old_ic'] ?? null,
                    'phone_mobile' => $member['phone_mobile'] ?? null,
                    'dm' => $member['dm'] ?? null,
                    'locality' => $member['locality'] ?? null,
                    'gender' => $member['gender'] ?? null,
                    'race' => $member['race'] ?? null,
                    'cula_code' => $member['cula_code'] ?? null,
                    'cula_display_label' => $member['cula_display_label'] ?? null,
                    'address' => $member['address'] ?? null,
                    'user_id' => $user->id,
                    'attended_at' => now(),
                ]);
            }

            $count++;
        }

        return redirect()
            ->route('program.index')
            ->with('success', $count . ' orang pemilih berjaya direkodkan sebagai hadir program.');
    }

    public function search(Request $request, Program $program, PemilihReportService $reportService)
    {
        $this->ensureAccessible($request->user()->id, $program);

        $path = Setting::valueOf('pemilih_report_file_path', PemilihReportService::DEFAULT_SAMPLE_PATH);

        $suggestions = $reportService->searchVoters(
            (string) $request->query('q', ''),
            $path,
            8,
            $request->user(),
        );

        $rawFilter = $program->committee_group_filters;
        $filter = is_array($rawFilter) ? ($rawFilter[0] ?? null) : $rawFilter;
        if ($filter) {
            [$groupId, $level] = explode(':', $filter) + [null, null];

            if ($groupId) {
                $positionIds = CommitteeGroup::find((int) $groupId)
                    ?->positions()
                    ?->pluck('committee_positions.id') ?? collect();

                if ($positionIds->isNotEmpty()) {
                    $query = CommitteeMembership::whereIn('committee_position_id', $positionIds);

                    if ($level) {
                        $query->where('level', $level);
                    }

                    $voterIds = $query->pluck('pemilih_record_id')->unique()->values()->all();

                    $suggestions = array_values(
                        array_filter($suggestions, fn ($voter) =>
                            in_array($voter['record_id'] ?? null, $voterIds)
                        )
                    );
                }
            }
        }

        if ($groupIds = $program->group_pemilih_filters) {
            $groups = GroupPemilih::with('kodCulas')->whereIn('id', $groupIds)->get();

            $suggestions = array_values(
                array_filter($suggestions, function ($voter) use ($groups) {
                    foreach ($groups as $group) {
                        $kodCulas = $group->kodCulas->pluck('kod_cula')->filter()->values()->all();
                        $culaOk = empty($kodCulas) || in_array($voter['cula_code'] ?? null, $kodCulas);
                        if (! $culaOk) continue;

                        $raceOk = ! $group->keturunan || ($voter['race'] ?? null) === $group->keturunan;
                        if (! $raceOk) continue;

                        $genderOk = ! $group->jantina || ($voter['gender'] ?? null) === $group->jantina;
                        if (! $genderOk) continue;

                        $age = $voter['age'] ?? null;
                        $ageOk = ($group->umur_dari === null && $group->umur_akhir === null)
                            || ($age !== null
                                && ($group->umur_dari === null || $age >= $group->umur_dari)
                                && ($group->umur_akhir === null || $age <= $group->umur_akhir));
                        if (! $ageOk) continue;

                        return true;
                    }
                    return false;
                })
            );
        }

        return response()->json([
            'suggestions' => $suggestions,
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
            'no_ahli' => ['nullable', 'string', 'max:255'],
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

        $user = $request->user();
        if (!$user->canAccessModule('kemaskini-no-ahli')) {
            unset($validated['no_ahli']);
        }

        $existing = $program->attendees()->where('voter_id', $validated['voter_id'])->first();

        if ($existing) {
            $existing->update([
                ...$validated,
                'attended_at' => now(),
            ]);
            $attendee = $existing;
        } else {
            $validated['user_id'] = $request->user()->id;
            $attendee = $program->attendees()->create([
                ...$validated,
                'attended_at' => now(),
            ]);
        }

        $attendee->subPrograms()->sync($subProgramIds);

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Pemilih berjaya direkodkan sebagai hadir program.');
    }

    public function destroyAttendee(Request $request, Program $program, ProgramAttendee $attendee): RedirectResponse
    {
        $this->ensureAccessible($request->user()->id, $program);
        $this->ensureAttendeeModifiable($request->user(), $program, $attendee);

        if ($attendee->program_id !== $program->id) {
            throw (new ModelNotFoundException)->setModel(ProgramAttendee::class, [$attendee->id]);
        }

        $attendee->delete();

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Kehadiran pemilih berjaya dipadam.');
    }

    public function storeMarkAttendee(Request $request, Program $program, ProgramAttendee $attendee): JsonResponse
    {
        $this->ensureAccessible($request->user()->id, $program);

        if ($attendee->program_id !== $program->id) {
            throw (new ModelNotFoundException)->setModel(ProgramAttendee::class, [$attendee->id]);
        }

        $pemilihRecord = PemilihRecord::query()
            ->where(function ($q) use ($attendee) {
                $q->where('no_kp', $attendee->no_kp);
                if ($attendee->old_ic) {
                    $q->orWhere('old_ic', $attendee->old_ic);
                }
            })
            ->first();

        if ($pemilihRecord) {
            CulaWorkItem::query()->firstOrCreate(
                ['pemilih_record_id' => $pemilihRecord->id],
                [
                    'marked_by' => $request->user()->id,
                    'marked_at' => now(),
                    'notes' => null,
                ]
            );
        }

        return response()->json(['marked' => true]);
    }

    public function destroyMarkAttendee(Request $request, Program $program, ProgramAttendee $attendee): JsonResponse
    {
        $this->ensureAccessible($request->user()->id, $program);

        if ($attendee->program_id !== $program->id) {
            throw (new ModelNotFoundException)->setModel(ProgramAttendee::class, [$attendee->id]);
        }

        $pemilihRecord = PemilihRecord::query()
            ->where(function ($q) use ($attendee) {
                $q->where('no_kp', $attendee->no_kp);
                if ($attendee->old_ic) {
                    $q->orWhere('old_ic', $attendee->old_ic);
                }
            })
            ->first();

        if ($pemilihRecord) {
            CulaWorkItem::query()
                ->where('pemilih_record_id', $pemilihRecord->id)
                ->delete();
        }

        return response()->json(['marked' => false]);
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
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('program_sub_programs', 'name')
                    ->where('program_id', $program->id),
            ],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $validated['name'] = strtolower(preg_replace('/\s+/', '_', $validated['name']));

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
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('program_sub_programs', 'name')
                    ->where('program_id', $program->id)
                    ->ignore($subProgram->id),
            ],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $validated['name'] = strtolower(preg_replace('/\s+/', '_', $validated['name']));

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
        $this->ensureAttendeeModifiable($request->user(), $program, $attendee);

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
            'committee_group_filters' => ['nullable', 'string', 'max:50'],
            'group_pemilih_filters' => ['nullable', 'array'],
            'group_pemilih_filters.*' => ['integer', 'exists:group_pemilihs,id'],
            'gambar' => ['nullable', 'image', 'max:2048'],
            'has_laporan' => ['nullable', 'boolean'],
        ]);
    }

    private function accessibleProgramsQuery(int $userId): Builder
    {
        $user = request()->user();
        if ($user->isMasterAdmin()) {
            return Program::query();
        }

        return Program::query()->where(function (Builder $query) use ($userId) {
            $query->where('user_id', $userId)
                ->orWhereHas('sharedUsers', fn (Builder $sharedQuery) => $sharedQuery->whereKey($userId));
        });
    }

    private function ensureAccessible(int $userId, Program $program): void
    {
        $user = request()->user();
        if ($user->isMasterAdmin()) {
            return;
        }

        abort_unless(
            (int) $program->user_id === $userId || $program->sharedUsers()->whereKey($userId)->exists(),
            403,
        );
    }

    private function ensureOwner(int $userId, Program $program): void
    {
        $user = request()->user();
        if ($user->isMasterAdmin()) {
            return;
        }

        abort_unless((int) $program->user_id === $userId, 403);
    }

    private function ensureGroupOwner(int $userId, ProgramGroup $group): void
    {
        abort_unless((int) $group->user_id === $userId, 403);
    }

    private function ensureAttendeeModifiable(User $user, Program $program, ProgramAttendee $attendee): void
    {
        if ($user->isMasterAdmin()) {
            return;
        }

        if ((int) $program->user_id === (int) $user->id) {
            return;
        }

        abort_unless((int) $attendee->user_id === (int) $user->id, 403);
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
