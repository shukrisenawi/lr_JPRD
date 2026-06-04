<?php

namespace App\Http\Controllers;

use App\Models\Program;
use App\Models\ProgramAttendee;
use App\Models\ProgramFile;
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

    public function mesyuarat(Request $request, Program $program): JsonResponse
    {
        $this->ensureAccessible($request->user()->id, $program);

        $filter = $program->committee_group_filters;
        if (is_array($filter)) {
            $filter = $filter[0] ?? null;
        }

        [$groupId, $level] = explode(':', $filter ?? '') + [null, null];

        $memberships = collect();
        if ($groupId) {
            $positionIds = CommitteeGroup::find((int) $groupId)
                ?->positions()
                ?->pluck('committee_positions.id') ?? collect();

            if ($positionIds->isNotEmpty()) {
                $memberships = CommitteeMembership::whereIn('committee_position_id', $positionIds)
                    ->when($level, fn ($q) => $q->where('level', $level))
                    ->with('voter', 'position')
                    ->get()
                    ->unique('pemilih_record_id')
                    ->values();
            }
        }

        $allPrograms = $this->accessibleProgramsQuery($request->user()->id)
            ->where('id', '!=', $program->id)
            ->where('is_mesyuarat', true)
            ->where('group_id', $program->group_id)
            ->with('attendees')
            ->get();

        $members = $memberships->map(function (CommitteeMembership $m) use ($allPrograms) {
            $previousCount = $allPrograms->sum(fn (Program $p) =>
                $p->attendees->where('voter_id', (string) $m->pemilih_record_id)->count()
            );

            return [
                'pemilih_record_id' => $m->pemilih_record_id,
                'name' => $m->voter?->name,
                'no_kp' => $m->voter?->no_kp,
                'phone_mobile' => $m->voter?->phone_mobile,
                'dm' => $m->voter?->dm,
                'position_name' => $m->position?->name,
                'previous_attendance' => $previousCount,
            ];
        })->values();

        $files = $program->files()->with('uploader:id,name')->latest()->get()->map(fn (ProgramFile $f) => [
            'id' => $f->id,
            'original_name' => $f->original_name,
            'type' => $f->type,
            'mime_type' => $f->mime_type,
            'size' => $f->size,
            'uploader' => $f->uploader?->name,
            'created_at' => $f->created_at?->format('d-m-Y H:i'),
        ]);

        return response()->json([
            'members' => $members,
            'files' => $files,
        ]);
    }

    public function uploadFile(Request $request, Program $program): RedirectResponse
    {
        $this->ensureAccessible($request->user()->id, $program);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $file = $validated['file'];
        $originalName = $file->getClientOriginalName();
        $storedName = $file->store('program-files/' . $program->id, 'public');
        $mimeType = $file->getMimeType();
        $size = $file->getSize();
        $type = str_starts_with($mimeType ?? '', 'image/') ? 'image' : 'document';

        $program->files()->create([
            'original_name' => $originalName,
            'stored_name' => $storedName,
            'type' => $type,
            'mime_type' => $mimeType,
            'size' => $size,
            'user_id' => $request->user()->id,
        ]);

        return redirect()->back()->with('success', 'Fail berjaya dimuat naik.');
    }

    public function downloadFile(Program $program, ProgramFile $file)
    {
        $this->ensureAccessible(request()->user()->id, $program);

        abort_unless(Storage::disk('public')->exists($file->stored_name), 404);

        return response()->download(
            Storage::disk('public')->path($file->stored_name),
            $file->original_name,
        );
    }

    public function destroyFile(Program $program, ProgramFile $file): RedirectResponse
    {
        $this->ensureAccessible(request()->user()->id, $program);

        if (Storage::disk('public')->exists($file->stored_name)) {
            Storage::disk('public')->delete($file->stored_name);
        }

        $file->delete();

        return redirect()->back()->with('success', 'Fail berjaya dipadam.');
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
            'is_mesyuarat' => ['nullable', 'boolean'],
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
