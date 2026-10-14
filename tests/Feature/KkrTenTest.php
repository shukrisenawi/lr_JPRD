<?php

use App\Models\CommitteeMembership;
use App\Models\CommitteePosition;
use App\Models\KadTen;
use App\Models\PemilihFamily;
use App\Models\PemilihRecord;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function kkrVoter(array $attributes = []): PemilihRecord
{
    static $number = 0;
    $number++;

    return PemilihRecord::query()->create(array_merge([
        'identity_number' => 'KKR'.str_pad((string) $number, 9, '0', STR_PAD_LEFT),
        'name' => 'KKR VOTER '.$number, 'dm' => 'UDM ALPHA', 'locality' => 'LOCALITY',
        'status' => 'aktif', 'is_manual' => false, 'cula_code' => '2', 'address' => 'JALAN ALPHA 10',
    ], $attributes));
}

function kkrCard(string $address = 'JALAN ALPHA 10', string $dm = 'UDM ALPHA'): KadTen
{
    $leader = kkrVoter(['address' => $address, 'dm' => $dm]);

    return KadTen::query()->create([
        'pemimpin_id' => $leader->id, 'level' => 'udm', 'scope_key' => $dm, 'scope_name' => $dm,
    ]);
}

function kkrFamily(array $members, array $attributes = []): PemilihFamily
{
    $family = PemilihFamily::query()->create(array_merge([
        'name' => 'KELUARGA UJIAN', 'address' => 'JALAN ALPHA 10', 'reviewed_at' => now(),
    ], $attributes));
    $family->members()->attach(collect($members)->pluck('id'));

    return $family;
}

it('assigns only reviewed families with addresses and eligible voters to the closest leader', function () {
    $admin = User::factory()->masterAdmin()->create();
    $near = kkrCard();
    $far = kkrCard('TAMAN BETA 99');
    $family = kkrFamily([kkrVoter(['cula_code' => '4P']), kkrVoter(['cula_code' => '1'])]);
    $unreviewed = kkrFamily([kkrVoter()], ['reviewed_at' => null]);
    $excluded = kkrFamily([kkrVoter(['cula_code' => '4'])]);
    $noAddress = kkrFamily([kkrVoter()], ['address' => null]);
    $outside = kkrFamily([kkrVoter(['dm' => 'UDM BETA'])]);

    $this->actingAs($admin)->post(route('kad-ten.auto-input'))->assertSessionHasNoErrors()->assertRedirect();
    expect($near->families()->pluck('pemilih_families.id')->all())->toBe([$family->id]);
    expect($far->families()->count())->toBe(0);
    foreach ([$unreviewed, $excluded, $noAddress, $outside] as $ignored) {
        expect($ignored->kadTens()->count())->toBe(0);
    }
    $this->post(route('kad-ten.auto-input'))->assertRedirect();
    expect($near->families()->count())->toBe(1);
});

it('limits assignments to ten families rather than ten individual voters', function () {
    $admin = User::factory()->masterAdmin()->create();
    $card = kkrCard();
    for ($i = 0; $i < 11; $i++) {
        kkrFamily([kkrVoter(), kkrVoter(['cula_code' => '3U'])]);
    }
    $this->actingAs($admin)->post(route('kad-ten.auto-input'))->assertRedirect();
    expect($card->families()->count())->toBe(10);
    expect(PemilihFamily::query()->whereDoesntHave('kadTens')->count())->toBe(1);
});

it('hides other cula codes without deleting family members and scopes the page', function () {
    $user = User::factory()->withModules(['kad-ten'])->create(['access_level' => 'udm', 'scope_key' => 'UDM ALPHA']);
    $card = kkrCard();
    $family = kkrFamily(collect(['2', '3', '3B', '3D', '3K', '3M', '3P', '3U', '4P', '1', '4', '7'])
        ->map(fn ($code) => kkrVoter(['cula_code' => $code]))->all());
    $card->families()->attach($family);
    kkrCard('OTHER ADDRESS', 'UDM BETA');

    $this->actingAs($user)->get(route('kad-ten.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('KadTen/KkrIndex')->has('kads.data', 1)->has('kads.data.0.families', 1)
        ->has('kads.data.0.families.0.members', 9));
    expect($family->members()->count())->toBe(12);
    $this->postJson(route('kad-ten.auto-input'))->assertForbidden();
    $this->postJson(route('kad-ten.reset-auto-input'))->assertForbidden();
});

it('resets family assignments without deleting leaders or families', function () {
    $admin = User::factory()->masterAdmin()->create();
    $card = kkrCard();
    $family = kkrFamily([kkrVoter()]);
    $card->families()->attach($family);
    $this->actingAs($admin)->post(route('kad-ten.reset-auto-input'))->assertRedirect();
    expect($card->families()->count())->toBe(0);
    expect(KadTen::query()->count())->toBe(1);
    expect(PemilihFamily::query()->count())->toBe(1);
});

it('keeps whole families within scope and blocks changing the leader to an incompatible scope', function () {
    $admin = User::factory()->masterAdmin()->create();
    $card = kkrCard();
    $mixed = kkrFamily([kkrVoter(), kkrVoter(['dm' => 'UDM BETA'])]);
    $this->actingAs($admin)->post(route('kad-ten.auto-input'))->assertRedirect();
    expect($mixed->kadTens()->count())->toBe(0);
    $family = kkrFamily([kkrVoter(['locality' => 'OTHER'])]);
    $card->families()->attach($family);
    $user = User::factory()->withModules(['kad-ten'])->create(['access_level' => 'udm', 'scope_key' => 'UDM ALPHA']);
    $this->actingAs($user)->put(route('kad-ten.update', $card), [
        'pemimpin_id' => $card->pemimpin_id, 'level' => 'cawangan',
    ])->assertSessionHasErrors('pemimpin_id');
    $this->delete(route('kad-ten.families.destroy', [$card, $family]))->assertRedirect();
    expect($family->fresh())->not->toBeNull();
    expect($card->families()->count())->toBe(0);
});

it('adds committee leaders only when family capacity is insufficient', function () {
    $admin = User::factory()->masterAdmin()->create();
    $position = CommitteePosition::query()->create(['name' => 'KETUA', 'slug' => 'kkr-ketua', 'sort_order' => 1]);
    for ($i = 0; $i < 3; $i++) {
        $leader = kkrVoter();
        CommitteeMembership::query()->create([
            'pemilih_record_id' => $leader->id, 'committee_position_id' => $position->id,
            'level' => 'udm', 'scope_key' => 'UDM ALPHA', 'scope_name' => 'UDM ALPHA',
        ]);
    }
    for ($i = 0; $i < 11; $i++) {
        kkrFamily([kkrVoter()]);
    }
    $this->actingAs($admin)->post(route('kad-ten.auto-input'))->assertRedirect();
    expect(KadTen::query()->count())->toBe(2);
    expect(PemilihFamily::query()->whereHas('kadTens')->count())->toBe(11);
    $this->post(route('kad-ten.auto-input'))->assertRedirect();
    expect(KadTen::query()->count())->toBe(2);
});

it('returns all UDM card summaries using distinct reviewed families and family-based leader targets', function () {
    $admin = User::factory()->masterAdmin()->create();
    $card = kkrCard();
    kkrCard('JALAN BETA', 'UDM BETA');
    $family = kkrFamily([kkrVoter(), kkrVoter(['cula_code' => '4P'])]);
    $card->families()->attach($family);
    for ($i = 0; $i < 10; $i++) {
        kkrFamily([kkrVoter()]);
    }
    kkrFamily([kkrVoter()], ['reviewed_at' => null]);
    kkrFamily([kkrVoter(['cula_code' => '1'])]);

    $this->actingAs($admin)->get(route('kad-ten.index'))->assertInertia(fn (Assert $page) => $page
        ->component('KadTen/KkrIndex')->has('udm_summaries', 2)
        ->where('udm_summaries.0.key', 'UDM ALPHA')
        ->where('udm_summaries.0.existing_leaders', 1)
        ->where('udm_summaries.0.required_leaders', 2)
        ->where('udm_summaries.0.total_families', 11)
        ->where('udm_summaries.0.assigned_families', 1)
        ->where('udm_summaries.1.total_families', 0));
    $this->get(route('kad-ten.index', ['udm' => 'UDM ALPHA']))->assertInertia(fn (Assert $page) => $page
        ->where('filters.udm', 'UDM ALPHA')->has('kads.data', 1)
        ->where('kads.data.0.id', $card->id)->has('kads.data.0.families', 1));
});
