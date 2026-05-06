<?php

use App\Http\Controllers\CopiedRecordController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SheetPageController;
use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/settings', [SettingsController::class, 'edit'])->name('settings.edit');
    Route::put('/settings', [SettingsController::class, 'update'])->name('settings.update');
    Route::post('/copied-records', [CopiedRecordController::class, 'store'])->name('copied-records.store');
    Route::post('/sheet-pages', [SheetPageController::class, 'store'])->name('sheet-pages.store');
    Route::delete('/sheet-pages/{sheetPage}', [SheetPageController::class, 'destroy'])->name('sheet-pages.destroy');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::get('/profile/avatar', [ProfileController::class, 'avatar'])->name('profile.avatar');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
