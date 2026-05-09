<?php

namespace App\Http\Controllers;

use App\Models\Program;
use App\Models\ProgramAttendee;
use App\Models\Setting;
use App\Services\PemilihReportService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProgramController extends Controller
{
    public function index(Request $request): Response
    {
        $programs = Program::query()
            ->with('attendees')
            ->latest('tarikh')
            ->latest('masa')
            ->latest('id')
            ->get();

        $selectedProgramId = (int) ($request->query('program') ?: ($programs->first()?->id ?? 0));
        $selectedProgram = $programs->firstWhere('id', $selectedProgramId);

        return Inertia::render('Program/Index', [
            'programs' => $programs
                ->map(fn (Program $program) => [
                    'id' => $program->id,
                    'tajuk' => $program->tajuk,
                    'tempat' => $program->tempat,
                    'tarikh' => $program->tarikh?->format('Y-m-d'),
                    'masa' => $program->masa?->format('H:i'),
                    'attendees_count' => $program->attendees->count(),
                ])
                ->values(),
            'selectedProgram' => $selectedProgram
                ? [
                    'id' => $selectedProgram->id,
                    'tajuk' => $selectedProgram->tajuk,
                    'tempat' => $selectedProgram->tempat,
                    'tarikh' => $selectedProgram->tarikh?->format('Y-m-d'),
                    'masa' => $selectedProgram->masa?->format('H:i'),
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
                            'attended_at' => $attendee->attended_at?->format('Y-m-d H:i:s'),
                        ])
                        ->values(),
                ]
                : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateProgram($request);

        $program = Program::query()->create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Program baharu berjaya ditambah.');
    }

    public function update(Request $request, Program $program): RedirectResponse
    {
        $program->update($this->validateProgram($request));

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Program berjaya dikemas kini.');
    }

    public function destroy(Program $program): RedirectResponse
    {
        $program->delete();

        return redirect()
            ->route('program.index')
            ->with('success', 'Program berjaya dipadam.');
    }

    public function search(Request $request, Program $program, PemilihReportService $reportService)
    {
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
        if ($attendee->program_id !== $program->id) {
            throw (new ModelNotFoundException)->setModel(ProgramAttendee::class, [$attendee->id]);
        }

        $attendee->delete();

        return redirect()
            ->route('program.index', ['program' => $program->id])
            ->with('success', 'Kehadiran pemilih berjaya dipadam.');
    }

    private function validateProgram(Request $request): array
    {
        return $request->validate([
            'tajuk' => ['required', 'string', 'max:255'],
            'tempat' => ['required', 'string', 'max:255'],
            'tarikh' => ['required', 'date'],
            'masa' => ['nullable', 'date_format:H:i'],
        ]);
    }
}
