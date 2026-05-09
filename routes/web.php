<?php

use App\Http\Controllers\Admin\AccessManagementController;
use App\Http\Controllers\CarianPemilihController;
use App\Http\Controllers\CopiedRecordController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LaporanController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SheetPageController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', DashboardController::class)->middleware('module:dashboard')->name('dashboard');
    Route::get('/laporan', [LaporanController::class, 'index'])->middleware('module:laporan')->name('laporan.index');
    Route::post('/laporan/upload', [LaporanController::class, 'upload'])->middleware('module:laporan')->name('laporan.upload');
    Route::get('/carian-pemilih', [CarianPemilihController::class, 'index'])->middleware('module:carian-pemilih')->name('carian-pemilih.index');
    Route::get('/carian-pemilih/search', [CarianPemilihController::class, 'search'])->middleware('module:carian-pemilih')->name('carian-pemilih.search');
    Route::get('/program', [ProgramController::class, 'index'])->middleware('module:program')->name('program.index');
    Route::post('/program', [ProgramController::class, 'store'])->middleware('module:program')->name('program.store');
    Route::put('/program/{program}', [ProgramController::class, 'update'])->middleware('module:program')->name('program.update');
    Route::delete('/program/{program}', [ProgramController::class, 'destroy'])->middleware('module:program')->name('program.destroy');
    Route::post('/program/{program}/share', [ProgramController::class, 'storeShare'])->middleware('module:program')->name('program.share.store');
    Route::get('/program/{program}/gambar', [ProgramController::class, 'gambar'])->middleware('module:program')->name('program.gambar');
    Route::get('/program/{program}/search', [ProgramController::class, 'search'])->middleware('module:program')->name('program.search');
    Route::post('/program/{program}/attendees', [ProgramController::class, 'storeAttendee'])->middleware('module:program')->name('program.attendees.store');
    Route::delete('/program/{program}/attendees/{attendee}', [ProgramController::class, 'destroyAttendee'])->middleware('module:program')->name('program.attendees.destroy');
    Route::get('/settings', [SettingsController::class, 'edit'])->middleware('module:settings')->name('settings.edit');
    Route::put('/settings', [SettingsController::class, 'update'])->middleware('module:settings')->name('settings.update');
    Route::post('/copied-records', [CopiedRecordController::class, 'store'])->middleware('module:dashboard')->name('copied-records.store');
    Route::post('/sheet-pages', [SheetPageController::class, 'store'])->middleware('module:dashboard')->name('sheet-pages.store');
    Route::get('/sheet-pages/on-off-status', [SheetPageController::class, 'onOffStatus'])->middleware('module:dashboard')->name('sheet-pages.on-off-status');
    Route::delete('/sheet-pages/{sheetPage}', [SheetPageController::class, 'destroy'])->middleware('module:dashboard')->name('sheet-pages.destroy');
    Route::get('/admin/access', [AccessManagementController::class, 'index'])->name('admin.access.index');
    Route::post('/admin/access/users', [AccessManagementController::class, 'storeUser'])->name('admin.access.users.store');
    Route::put('/admin/access/users/{user}', [AccessManagementController::class, 'updateUser'])->name('admin.access.users.update');
    Route::delete('/admin/access/users/{user}', [AccessManagementController::class, 'destroyUser'])->name('admin.access.users.destroy');
    Route::post('/admin/access/roles', [AccessManagementController::class, 'storeRole'])->name('admin.access.roles.store');
    Route::put('/admin/access/roles/{role}', [AccessManagementController::class, 'updateRole'])->name('admin.access.roles.update');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::get('/profile/avatar', [ProfileController::class, 'avatar'])->name('profile.avatar');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
