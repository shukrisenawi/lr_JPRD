<?php

use App\Http\Controllers\Admin\AccessManagementController;
use App\Http\Controllers\CarianPemilihController;
use App\Http\Controllers\CommitteeController;
use App\Http\Controllers\CopiedRecordController;
use App\Http\Controllers\CulaanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GroupPemilihController;
use App\Http\Controllers\LaporanController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TambahPemilihController;
use App\Http\Controllers\SheetPageController;
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
    Route::get('/carian-pemilih/search', [CarianPemilihController::class, 'search'])->middleware('module:carian-pemilih')->name('carian-pemilih.search');
    Route::post('/carian-pemilih/update-no-ahli', [CarianPemilihController::class, 'updateNoAhli'])->middleware('module:carian-pemilih')->name('carian-pemilih.update-no-ahli');
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
    Route::delete('/program/{program}/attendees/{attendee}', [ProgramController::class, 'destroyAttendee'])->middleware('module:program')->name('program.attendees.destroy');
    Route::post('/program/{program}/sub-programs', [ProgramController::class, 'storeSubProgram'])->middleware('module:program')->name('program.sub-programs.store');
    Route::put('/program/sub-programs/{subProgram}', [ProgramController::class, 'updateSubProgram'])->middleware('module:program')->name('program.sub-programs.update');
    Route::delete('/program/sub-programs/{subProgram}', [ProgramController::class, 'destroySubProgram'])->middleware('module:program')->name('program.sub-programs.destroy');
    Route::put('/program/{program}/attendees/{attendee}/sub-programs', [ProgramController::class, 'updateAttendeeSubPrograms'])->middleware('module:program')->name('program.attendees.sub-programs.update');
    Route::post('/program/{program}/attendees/{attendee}/mark', [ProgramController::class, 'storeMarkAttendee'])->middleware('module:program')->name('program.attendees.mark.store');
    Route::delete('/program/{program}/attendees/{attendee}/mark', [ProgramController::class, 'destroyMarkAttendee'])->middleware('module:program')->name('program.attendees.mark.destroy');
    Route::get('/jawatankuasa', [CommitteeController::class, 'index'])->middleware('module:jawatankuasa')->name('jawatankuasa.index');
    Route::get('/jawatankuasa/search', [CommitteeController::class, 'search'])->middleware('module:jawatankuasa.senarai')->name('jawatankuasa.search');
    Route::post('/jawatankuasa/groups', [CommitteeController::class, 'storeGroup'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.store');
    Route::put('/jawatankuasa/groups/{group}', [CommitteeController::class, 'updateGroup'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.update');
    Route::delete('/jawatankuasa/groups/{group}', [CommitteeController::class, 'destroyGroup'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.destroy');
    Route::post('/jawatankuasa/groups/{group}/positions', [CommitteeController::class, 'storeGroupPosition'])->middleware('module:jawatankuasa.kumpulan')->name('jawatankuasa.groups.positions.store');
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
    Route::post('/culaan/{pemilihRecord}/mark', [CulaanController::class, 'storeMark'])->middleware('module:culaan.senarai')->name('culaan.mark.store');
    Route::delete('/culaan/{pemilihRecord}/mark', [CulaanController::class, 'destroyMark'])->middleware('module:culaan.senarai')->name('culaan.mark.destroy');
    Route::get('/settings', [SettingsController::class, 'edit'])->middleware('module:settings')->name('settings.edit');
    Route::put('/settings', [SettingsController::class, 'update'])->middleware('module:settings')->name('settings.update');
    Route::post('/settings/pemilih-upload', [SettingsController::class, 'uploadPemilih'])->middleware('module:settings')->name('settings.pemilih-upload');
    Route::get('/settings/database/export', [SettingsController::class, 'exportDatabase'])->middleware('module:settings')->name('settings.database.export');
    Route::post('/settings/database/import', [SettingsController::class, 'importDatabase'])->middleware('module:settings')->name('settings.database.import');
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

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::get('/profile/avatar/{user}', [ProfileController::class, 'avatar'])->name('profile.avatar');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
