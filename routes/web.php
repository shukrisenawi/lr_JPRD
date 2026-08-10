<?php

use App\Http\Controllers\Admin\AccessManagementController;
use App\Http\Controllers\Admin\ApiKeyController;
use App\Http\Controllers\Admin\SpokasController;
use App\Http\Controllers\AhliPasController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\VoterController;
use App\Http\Controllers\CarianPemilihController;
use App\Http\Controllers\CommitteeController;
use App\Http\Controllers\CopiedRecordController;
use App\Http\Controllers\CulaanBotController;
use App\Http\Controllers\CulaanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GroupPemilihController;
use App\Http\Controllers\KadTenController;
use App\Http\Controllers\LaporanController;
use App\Http\Controllers\PemilihHashtagController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\PusatKhidmatController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SheetPageController;
use App\Http\Controllers\TambahPemilihController;
use App\Http\Controllers\VccController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    // Guna named route — Laravel akan jana URL betul
    // sama ada app di root atau subdirectory.
    return auth()->check() ? redirect()->route('dashboard') : redirect()->route('login');
});

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', DashboardController::class)->middleware('module:dashboard')->name('dashboard');
    Route::get('/laporan', [LaporanController::class, 'index'])->middleware('module:laporan')->name('laporan.index');
    Route::get('/carian-pemilih', [CarianPemilihController::class, 'index'])->middleware('module:carian-pemilih')->name('carian-pemilih.index');
    Route::get('/ahli-pas', [AhliPasController::class, 'index'])->middleware('module:ahli-pas')->name('ahli-pas.index');
    Route::post('/ahli-pas/{pemilihRecord}/cula', [AhliPasController::class, 'updateCula'])->middleware('module:ahli-pas')->name('ahli-pas.cula.update');
    Route::get('/carian-pemilih/search', [CarianPemilihController::class, 'search'])->middleware('module:carian-pemilih')->name('carian-pemilih.search');
    Route::post('/carian-pemilih/update-no-ahli', [CarianPemilihController::class, 'updateNoAhli'])->middleware('module:carian-pemilih')->name('carian-pemilih.update-no-ahli');
    Route::post('/carian-pemilih/{pemilihRecord}/update-cula', [CarianPemilihController::class, 'updateCula'])->middleware('module:carian-pemilih')->name('carian-pemilih.update-cula');
    Route::post('/pemilih/{pemilihRecord}/avatar', [CarianPemilihController::class, 'uploadAvatar'])->name('pemilih.avatar.upload');
    Route::get('/pemilih/hashtags', [PemilihHashtagController::class, 'suggestions'])->name('pemilih.hashtags.suggestions');
    Route::put('/pemilih/{pemilihRecord}/hashtags', [PemilihHashtagController::class, 'update'])->name('pemilih.hashtags.update');
    Route::get('/pemilih/{pemilihRecord}/avatar', [CarianPemilihController::class, 'avatar'])->name('pemilih.avatar');
    Route::post('/pemilih/{pemilihRecord}/birthday-image', [CarianPemilihController::class, 'uploadBirthdayImage'])->name('pemilih.birthday-image.upload');
    Route::get('/pemilih/{pemilihRecord}/birthday-image', [CarianPemilihController::class, 'birthdayImage'])->name('pemilih.birthday-image');
    Route::delete('/pemilih/{pemilihRecord}/birthday-image', [CarianPemilihController::class, 'destroyBirthdayImage'])->name('pemilih.birthday-image.destroy');
    Route::get('/program', [ProgramController::class, 'index'])->middleware('module:program')->name('program.index');
    Route::post('/program', [ProgramController::class, 'store'])->middleware('module:program')->name('program.store');
    Route::post('/program/groups', [ProgramController::class, 'storeGroup'])->middleware('module:program')->name('program.groups.store');
    Route::put('/program/{program}', [ProgramController::class, 'update'])->middleware('module:program')->name('program.update');
    Route::put('/program/groups/{group}', [ProgramController::class, 'updateGroup'])->middleware('module:program')->name('program.groups.update');
    Route::delete('/program/{program}', [ProgramController::class, 'destroy'])->middleware('module:program')->name('program.destroy');
    Route::delete('/program/groups/{group}', [ProgramController::class, 'destroyGroup'])->middleware('module:program')->name('program.groups.destroy');
    Route::post('/program/{program}/share', [ProgramController::class, 'storeShare'])->middleware('module:program')->name('program.share.store');
    Route::get('/program/{program}/gambar', [ProgramController::class, 'gambar'])->middleware('module:program')->name('program.gambar');
    Route::get('/program/{program}/search', [ProgramController::class, 'search'])->middleware('module:program')->name('program.search');
    Route::get('/program/{program}/laporan', [ProgramController::class, 'laporan'])->middleware('module:program')->name('program.laporan');
    Route::post('/program/{program}/attendees', [ProgramController::class, 'storeAttendee'])->middleware('module:program')->name('program.attendees.store');
    Route::post('/program/{program}/attendees/bulk', [ProgramController::class, 'storeBulkAttendees'])->middleware('module:program')->name('program.attendees.store-bulk');
    Route::get('/program/{program}/committee-members', [ProgramController::class, 'committeeMembers'])->middleware('module:program')->name('program.committee-members');
    Route::delete('/program/{program}/attendees/{attendee}', [ProgramController::class, 'destroyAttendee'])->middleware('module:program')->name('program.attendees.destroy');
    Route::post('/program/{program}/sub-programs', [ProgramController::class, 'storeSubProgram'])->middleware('module:program')->name('program.sub-programs.store');
    Route::put('/program/sub-programs/{subProgram}', [ProgramController::class, 'updateSubProgram'])->middleware('module:program')->name('program.sub-programs.update');
    Route::delete('/program/sub-programs/{subProgram}', [ProgramController::class, 'destroySubProgram'])->middleware('module:program')->name('program.sub-programs.destroy');
    Route::put('/program/{program}/attendees/{attendee}/sub-programs', [ProgramController::class, 'updateAttendeeSubPrograms'])->middleware('module:program')->name('program.attendees.sub-programs.update');
    Route::post('/program/{program}/attendees/{attendee}/mark', [ProgramController::class, 'storeMarkAttendee'])->middleware('module:program')->name('program.attendees.mark.store');
    Route::delete('/program/{program}/attendees/{attendee}/mark', [ProgramController::class, 'destroyMarkAttendee'])->middleware('module:program')->name('program.attendees.mark.destroy');
    Route::post('/program/{program}/attendees/{attendee}/update-cula', [ProgramController::class, 'updateCulaAttendee'])->middleware('module:program')->name('program.attendees.update-cula');
    Route::get('/program/{program}/mesyuarat', [ProgramController::class, 'mesyuarat'])->middleware('module:program')->name('program.mesyuarat');
    Route::post('/program/{program}/files', [ProgramController::class, 'uploadFile'])->middleware('module:program')->name('program.files.upload');
    Route::get('/program/{program}/files/{file}/download', [ProgramController::class, 'downloadFile'])->middleware('module:program')->name('program.files.download');
    Route::delete('/program/{program}/files/{file}', [ProgramController::class, 'destroyFile'])->middleware('module:program')->name('program.files.destroy');
    Route::get('/jawatankuasa', [CommitteeController::class, 'index'])->middleware('module:jawatankuasa')->name('jawatankuasa.index');
    Route::get('/jawatankuasa/senarai-ajk', [CommitteeController::class, 'laporan'])->middleware('module:jawatankuasa.laporan')->name('jawatankuasa.laporan');
    Route::get('/jawatankuasa/senarai-ajk-udm', [CommitteeController::class, 'senaraiAjkUdm'])->middleware('module:jawatankuasa.senarai-udm')->name('jawatankuasa.senarai-ajk-udm');
    Route::get('/jawatankuasa/search', [CommitteeController::class, 'search'])->middleware('module:jawatankuasa.senarai')->name('jawatankuasa.search');
    Route::post('/jawatankuasa/groups', [CommitteeController::class, 'storeGroup'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.store');
    Route::put('/jawatankuasa/groups/{group}', [CommitteeController::class, 'updateGroup'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.update');
    Route::delete('/jawatankuasa/groups/{group}', [CommitteeController::class, 'destroyGroup'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.destroy');
    Route::post('/jawatankuasa/groups/{group}/positions', [CommitteeController::class, 'storeGroupPosition'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.positions.store');
    Route::post('/jawatankuasa/groups/{group}/positions/bulk', [CommitteeController::class, 'storeGroupPositions'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.positions.store-bulk');
    Route::put('/jawatankuasa/groups/{group}/positions/reorder', [CommitteeController::class, 'reorderGroupPositions'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.positions.reorder');
    Route::delete('/jawatankuasa/groups/{group}/positions/{position}', [CommitteeController::class, 'destroyGroupPosition'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.positions.destroy');
    Route::post('/jawatankuasa/positions', [CommitteeController::class, 'storePosition'])->middleware('module:jawatankuasa.jawatan')->name('jawatankuasa.positions.store');
    Route::put('/jawatankuasa/positions/reorder', [CommitteeController::class, 'reorderPositions'])->middleware('module:jawatankuasa.jawatan')->name('jawatankuasa.positions.reorder');
    Route::put('/jawatankuasa/positions/{position}', [CommitteeController::class, 'updatePosition'])->middleware('module:jawatankuasa.jawatan')->name('jawatankuasa.positions.update');
    Route::delete('/jawatankuasa/positions/{position}', [CommitteeController::class, 'destroyPosition'])->middleware('module:jawatankuasa.jawatan')->name('jawatankuasa.positions.destroy');
    Route::post('/jawatankuasa/memberships', [CommitteeController::class, 'storeMembership'])->middleware('module:jawatankuasa.senarai')->name('jawatankuasa.memberships.store');
    Route::delete('/jawatankuasa/memberships/{membership}', [CommitteeController::class, 'destroyMembership'])->middleware('module:jawatankuasa.senarai')->name('jawatankuasa.memberships.destroy');
    Route::get('/tambah-pemilih', [TambahPemilihController::class, 'index'])->middleware('module:tambah-pemilih')->name('tambah-pemilih.index');
    Route::post('/tambah-pemilih', [TambahPemilihController::class, 'store'])->middleware('module:tambah-pemilih')->name('tambah-pemilih.store');
    Route::put('/tambah-pemilih/{pemilihRecord}', [TambahPemilihController::class, 'update'])->middleware('module:tambah-pemilih')->name('tambah-pemilih.update');
    Route::delete('/tambah-pemilih/{pemilihRecord}', [TambahPemilihController::class, 'destroy'])->middleware('module:tambah-pemilih')->name('tambah-pemilih.destroy');

    Route::get('/group-pemilih', [GroupPemilihController::class, 'index'])->middleware('module:group-pemilih')->name('group-pemilih.index');
    Route::post('/group-pemilih', [GroupPemilihController::class, 'store'])->middleware('module:group-pemilih')->name('group-pemilih.store');
    Route::put('/group-pemilih/{group}', [GroupPemilihController::class, 'update'])->middleware('module:group-pemilih')->name('group-pemilih.update');
    Route::delete('/group-pemilih/{group}', [GroupPemilihController::class, 'destroy'])->middleware('module:group-pemilih')->name('group-pemilih.destroy');

    Route::get('/culaan', [CulaanController::class, 'index'])->middleware('module:culaan')->name('culaan.index');
    Route::get('/culaan/export', [CulaanController::class, 'export'])->middleware('module:culaan.senarai')->name('culaan.export');
    Route::get('/culaan/search', [CulaanController::class, 'search'])->middleware('module:culaan.senarai')->name('culaan.search');
    Route::get('/culaan/alamat/{pemilihRecord}', [CulaanController::class, 'searchByAddress'])->middleware('module:culaan.senarai')->name('culaan.alamat');
    Route::get('/culaan/rumah/{pemilihRecord}', [CulaanController::class, 'searchByRumah'])->middleware('module:culaan.senarai')->name('culaan.rumah');
    Route::get('/culaan/rumah-alamat/{pemilihRecord}', [CulaanController::class, 'searchByRumahAlamat'])->middleware('module:culaan.senarai')->name('culaan.rumah-alamat');
    Route::post('/culaan/{pemilihRecord}/mark', [CulaanController::class, 'storeMark'])->middleware('module:culaan.senarai')->name('culaan.mark.store');
    Route::delete('/culaan/{pemilihRecord}/mark', [CulaanController::class, 'destroyMark'])->middleware('module:culaan.senarai')->name('culaan.mark.destroy');
    Route::post('/culaan/{pemilihRecord}/approve-error', [CulaanController::class, 'approveDataError'])->middleware('module:culaan.senarai')->name('culaan.approve-error');
    Route::post('/culaan/{pemilihRecord}/update-cula-mark', [CulaanController::class, 'updateCulaAndMark'])->middleware('module:culaan.senarai')->name('culaan.update-cula-mark');
    Route::post('/culaan/batch-approve-error', [CulaanController::class, 'batchApproveDataError'])->middleware('module:culaan.senarai')->name('culaan.batch-approve-error');

    Route::get('/culaan-bot', [CulaanBotController::class, 'index'])->middleware('module:culaan-bot')->name('culaan-bot.index');
    Route::get('/culaan-bot/search', [CulaanBotController::class, 'search'])->middleware('module:culaan-bot')->name('culaan-bot.search');
    Route::get('/culaan-bot/alamat/{pemilihRecord}', [CulaanBotController::class, 'searchByAddress'])->middleware('module:culaan-bot')->name('culaan-bot.alamat');
    Route::get('/culaan-bot/rumah/{pemilihRecord}', [CulaanBotController::class, 'searchByRumah'])->middleware('module:culaan-bot')->name('culaan-bot.rumah');
    Route::get('/culaan-bot/rumah-alamat/{pemilihRecord}', [CulaanBotController::class, 'searchByRumahAlamat'])->middleware('module:culaan-bot')->name('culaan-bot.rumah-alamat');
    Route::post('/culaan-bot/{pemilihRecord}/mark', [CulaanBotController::class, 'storeMark'])->middleware('module:culaan-bot')->name('culaan-bot.mark.store');
    Route::delete('/culaan-bot/{pemilihRecord}/mark', [CulaanBotController::class, 'destroyMark'])->middleware('module:culaan-bot')->name('culaan-bot.mark.destroy');
    Route::post('/culaan-bot/{pemilihRecord}/update-cula', [CulaanBotController::class, 'updateCula'])->middleware('module:culaan-bot')->name('culaan-bot.update-cula');

    Route::get('/vcc', [VccController::class, 'index'])->middleware('module:vcc')->name('vcc.index');
    Route::get('/vcc/search', [VccController::class, 'search'])->middleware('module:vcc')->name('vcc.search');
    Route::post('/vcc/{pemilihRecord}/mark', [VccController::class, 'storeMark'])->middleware('module:vcc')->name('vcc.mark.store');
    Route::delete('/vcc/{pemilihRecord}/mark', [VccController::class, 'destroyMark'])->middleware('module:vcc')->name('vcc.mark.destroy');
    Route::post('/vcc/{pemilihRecord}/update-cula', [VccController::class, 'updateCula'])->middleware('module:vcc')->name('vcc.update-cula');
    Route::post('/vcc/communication/log', [VccController::class, 'logCommunication'])->middleware('module:vcc')->name('vcc.communication.log');

    Route::get('/kad-ten', [KadTenController::class, 'index'])->middleware('module:kad-ten')->name('kad-ten.index');
    Route::post('/kad-ten', [KadTenController::class, 'store'])->middleware('module:kad-ten')->name('kad-ten.store');
    Route::put('/kad-ten/{kadTen}', [KadTenController::class, 'update'])->middleware('module:kad-ten')->name('kad-ten.update');
    Route::delete('/kad-ten/{kadTen}', [KadTenController::class, 'destroy'])->middleware('module:kad-ten')->name('kad-ten.destroy');
    Route::post('/kad-ten/{kadTen}/members', [KadTenController::class, 'storeMember'])->middleware('module:kad-ten')->name('kad-ten.members.store');
    Route::delete('/kad-ten/{kadTen}/members/{member}', [KadTenController::class, 'destroyMember'])->middleware('module:kad-ten')->name('kad-ten.members.destroy');
    Route::get('/kad-ten/search-pemilih', [KadTenController::class, 'searchPemilih'])->middleware('module:kad-ten')->name('kad-ten.search-pemilih');
    Route::get('/kad-ten/suggest-pemimpin', [KadTenController::class, 'suggestPemimpin'])->middleware('module:kad-ten')->name('kad-ten.suggest-pemimpin');
    Route::get('/kad-ten/{pemilihRecord}/clusters', [KadTenController::class, 'clustersFor'])->middleware('module:kad-ten')->name('kad-ten.clusters');
    Route::get('/kad-ten/senarai-pemilih', [KadTenController::class, 'senaraiPemilih'])->middleware('module:kad-ten')->name('kad-ten.senarai-pemilih');
    Route::post('/kad-ten/{kadTen}/assign-voter', [KadTenController::class, 'assignVoter'])->middleware('module:kad-ten')->name('kad-ten.assign-voter');

    Route::get('/settings', [SettingsController::class, 'edit'])->middleware('module:settings')->name('settings.edit');
    Route::put('/settings', [SettingsController::class, 'update'])->middleware('module:settings')->name('settings.update');
    Route::post('/settings/pemilih-upload', [SettingsController::class, 'uploadPemilih'])->middleware('module:settings.upload-pemilih')->name('settings.pemilih-upload');
    Route::get('/settings/database/export', [SettingsController::class, 'exportDatabase'])->middleware('module:settings.backup-database')->name('settings.database.export');
    Route::post('/copied-records', [CopiedRecordController::class, 'store'])->middleware('module:dashboard')->name('copied-records.store');
    Route::post('/sheet-pages', [SheetPageController::class, 'store'])->middleware('module:dashboard')->name('sheet-pages.store');
    Route::get('/sheet-pages/on-off-status', [SheetPageController::class, 'onOffStatus'])->middleware('module:dashboard')->name('sheet-pages.on-off-status');
    Route::delete('/sheet-pages/{sheetPage}', [SheetPageController::class, 'destroy'])->middleware('module:dashboard')->name('sheet-pages.destroy');
    Route::get('/admin/access', [AccessManagementController::class, 'index'])->name('admin.access.index');
    Route::post('/admin/access/users', [AccessManagementController::class, 'storeUser'])->name('admin.access.users.store');
    Route::put('/admin/access/users/{user}', [AccessManagementController::class, 'updateUser'])->name('admin.access.users.update');
    Route::delete('/admin/access/users/{user}', [AccessManagementController::class, 'destroyUser'])->name('admin.access.users.destroy');
    Route::post('/admin/access/users/{user}/reset-password', [AccessManagementController::class, 'resetPassword'])->name('admin.access.users.reset-password');
    Route::post('/admin/access/users/{user}/impersonate', [AccessManagementController::class, 'impersonateUser'])->name('admin.access.users.impersonate');
    Route::post('/admin/access/impersonation/stop', [AccessManagementController::class, 'stopImpersonation'])->name('admin.access.impersonation.destroy');
    Route::post('/admin/access/roles', [AccessManagementController::class, 'storeRole'])->name('admin.access.roles.store');
    Route::put('/admin/access/roles/{role}', [AccessManagementController::class, 'updateRole'])->name('admin.access.roles.update');

    Route::get('/admin/api-keys', [ApiKeyController::class, 'index'])->name('admin.api-keys.index');
    Route::post('/admin/api-keys', [ApiKeyController::class, 'store'])->name('admin.api-keys.store');
    Route::delete('/admin/api-keys/{apiKey}', [ApiKeyController::class, 'destroy'])->name('admin.api-keys.destroy');
    Route::get('/admin/spokas', [SpokasController::class, 'index'])->name('admin.spokas.index');
    Route::post('/admin/spokas/migrate', [SpokasController::class, 'migrate'])->name('admin.spokas.migrate');

    Route::get('/pusat-khidmat', [PusatKhidmatController::class, 'index'])->middleware('module:pusat-khidmat')->name('pusat-khidmat.index');
    Route::post('/pusat-khidmat/manual', [PusatKhidmatController::class, 'storeManual'])->middleware('module:pusat-khidmat')->name('pusat-khidmat.manual.store');
    Route::post('/pusat-khidmat/sync', [PusatKhidmatController::class, 'sync'])->middleware('module:pusat-khidmat')->name('pusat-khidmat.sync');
    Route::post('/pusat-khidmat/sheet-url', [PusatKhidmatController::class, 'updateSheetUrl'])->middleware('module:pusat-khidmat')->name('pusat-khidmat.sheet-url');
    Route::post('/pusat-khidmat/{pemilihRecord}/update-cula', [PusatKhidmatController::class, 'updateCula'])->middleware('module:pusat-khidmat')->name('pusat-khidmat.update-cula');
    Route::post('/pusat-khidmat/{record}/check', [PusatKhidmatController::class, 'toggleCheck'])->middleware('module:pusat-khidmat')->name('pusat-khidmat.check');

    Route::post('/preferences', function (Request $request) {
        $request->validate([
            'key' => 'required|string',
            'value' => 'nullable',
        ]);
        $request->user()->update([
            'preferences' => array_merge($request->user()->preferences ?? [], [
                $request->key => $request->value,
            ]),
        ]);

        return response()->json(['ok' => true]);
    })->name('preferences.save');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::get('/profile/avatar/{user}', [ProfileController::class, 'avatar'])->name('profile.avatar');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

Route::get('/api/voters/birthdays', [VoterController::class, 'birthdays'])->name('api.voters.birthdays');
Route::get('/api/reports/udm', [ReportController::class, 'udm'])->name('api.reports.udm');
