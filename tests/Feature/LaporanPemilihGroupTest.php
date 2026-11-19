<?php

use App\Models\GroupPemilih;
use App\Models\PemilihRecord;
use App\Models\User;
use App\Services\PemilihGroupSummaryService;
use Database\Seeders\GroupPemilihSeeder;
use Illuminate\Support\Str;

function groupSummaryVoter(int $age, string $gender, array $attributes = []): PemilihRecord
{
    return PemilihRecord::create(array_merge([
        'identity_number' => (string) Str::uuid(),
        'name' => 'PEMILIH UJIAN',
        'no_kp' => str_pad((string) ((2026 - $age) % 100), 2, '0', STR_PAD_LEFT).'01010001',
        'gender' => $gender,
        'race' => 'M',
        'status' => 'aktif',
        'is_manual' => false,
        'dm' => 'UDM A',
    ], $attributes));
}

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 11, 19));
});

it('shows four group cards with gender totals using the configured age boundaries', function () {
    $user = User::factory()->withModules(['laporan'])->create();
    $this->seed(GroupPemilihSeeder::class);
    foreach ([18, 22, 23, 39, 40, 60, 61, 99] as $age) {
        groupSummaryVoter($age, 'L');
        groupSummaryVoter($age, 'P');
    }
    groupSummaryVoter(17, 'L');
    groupSummaryVoter(30, 'L', ['race' => 'C']);
    groupSummaryVoter(30, 'L', ['status' => 'xaktif']);
    groupSummaryVoter(30, 'L', ['is_manual' => true]);
    groupSummaryVoter(30, 'P', ['no_kp' => null]);
    groupSummaryVoter(50, 'P', ['cula_code' => 'M']);

    $this->actingAs($user)->get(route('laporan.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->component('Laporan')
            ->where('pemilih_group_summary', [
                ['label' => 'FTV', 'total' => 4, 'male' => 2, 'female' => 2],
                ['label' => 'Muda', 'total' => 4, 'male' => 2, 'female' => 2],
                ['label' => 'Ulung', 'total' => 5, 'male' => 2, 'female' => 3],
                ['label' => 'Warga Emas', 'total' => 4, 'male' => 2, 'female' => 2],
            ]));
});

it('uses changed group settings and cula filters without counting overlapping groups twice', function () {
    $user = User::factory()->withModules(['laporan'])->create();
    $group = GroupPemilih::create([
        'user_id' => $user->id,
        'nama_group' => 'Muda Lelaki', 'umur_dari' => 25, 'umur_akhir' => 30,
        'jantina' => 'L', 'keturunan' => 'M',
    ]);
    $group->kodCulas()->create(['kod_cula' => '2']);
    GroupPemilih::create($group->only(['user_id', 'nama_group', 'umur_dari', 'umur_akhir', 'jantina', 'keturunan']))
        ->kodCulas()->create(['kod_cula' => '2']);
    groupSummaryVoter(25, 'L', ['cula_code' => '2']);
    groupSummaryVoter(24, 'L', ['cula_code' => '2']);
    groupSummaryVoter(25, 'L', ['cula_code' => '1']);
    groupSummaryVoter(25, 'P', ['cula_code' => '2']);

    expect(app(PemilihGroupSummaryService::class)->summary($user))->toBe([
        ['label' => 'FTV', 'total' => 0, 'male' => 0, 'female' => 0],
        ['label' => 'Muda', 'total' => 1, 'male' => 1, 'female' => 0],
        ['label' => 'Ulung', 'total' => 0, 'male' => 0, 'female' => 0],
        ['label' => 'Warga Emas', 'total' => 0, 'male' => 0, 'female' => 0],
    ]);
});

it('limits group totals to the users UDM scope', function () {
    $user = User::factory()->withModules(['laporan'])->create([
        'access_level' => 'udm', 'scope_key' => 'UDM A',
    ]);
    $this->seed(GroupPemilihSeeder::class);
    groupSummaryVoter(30, 'L');
    groupSummaryVoter(30, 'P', ['dm' => 'UDM B']);

    expect(app(PemilihGroupSummaryService::class)->summary($user)[1])
        ->toBe(['label' => 'Muda', 'total' => 1, 'male' => 1, 'female' => 0]);
});

it('requires laporan module access', function () {
    $user = User::factory()->withModules(['group-pemilih'])->create();
    $this->actingAs($user)->getJson(route('laporan.index'))->assertForbidden();
});
