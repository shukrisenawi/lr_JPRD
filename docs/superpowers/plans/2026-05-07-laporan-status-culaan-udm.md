# Laporan Status Culaan UDM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kemas kini halaman `/laporan` supaya memaparkan analitik mengikut UDM dengan label status culaan penuh, metrik liputan, dan pilihan UDM yang stabil.

**Architecture:** Kekalkan struktur data sedia ada seperti `by_dm` dan `dm_details` untuk elak refaktor besar, tetapi tambah normalisasi kod cula, label paparan, dan `key` komposit pada lapisan servis. Komponen React sedia ada akan dipacu oleh medan baharu untuk tab UDM, Lokaliti, dan Status Culaan.

**Tech Stack:** Laravel, Inertia.js, React, Pest, Vite

---

### Task 1: Lindungi kontrak laporan dengan ujian

**Files:**
- Modify: `tests/Feature/ReportTest.php`

- [ ] **Step 1: Tambah ujian gagal untuk label cula, key UDM, dan metrik liputan**
- [ ] **Step 2: Jalankan `php artisan test --filter=ReportTest` dan sahkan ujian baharu gagal**

### Task 2: Kemas kini servis laporan

**Files:**
- Modify: `app/Services/PemilihReportService.php`

- [ ] **Step 1: Tambah normalisasi kod cula, kamus label penuh, dan versi skema cache**
- [ ] **Step 2: Tambah `display_label`, `belum_dicula`, `coverage_percent`, dan `key` pada agregat berkaitan**
- [ ] **Step 3: Jalankan `php artisan test --filter=ReportTest` dan pastikan ujian servis lulus**

### Task 3: Kemas kini paparan `/laporan`

**Files:**
- Modify: `resources/js/Pages/Laporan.jsx`

- [ ] **Step 1: Tukar semua teks DM kepada UDM dan ubah ringkasan utama**
- [ ] **Step 2: Tambah dropdown UDM berasaskan `key` serta carta/jadual yang guna label culaan penuh**
- [ ] **Step 3: Jalankan `npm run build` untuk sahkan paparan boleh dibina**

### Task 4: Penutup kerja

**Files:**
- Modify: fail yang berubah dalam tugasan ini

- [ ] **Step 1: Semak diff akhir dan status git**
- [ ] **Step 2: `git add` fail berkaitan**
- [ ] **Step 3: `git commit -m "Kemaskini laporan status culaan UDM"`**
- [ ] **Step 4: `git push origin` pada branch semasa**
