<?php

return [
    'dashboard' => [
        'label' => 'Cula Manual',
        'description' => 'Paparan utama dan ringkasan status semasa.',
    ],
    'laporan' => [
        'label' => 'Laporan',
        'description' => 'Lihat dan muat naik laporan pemilih.',
    ],
    'carian-pemilih' => [
        'label' => 'Carian Pemilih',
        'description' => 'Carian data pemilih dari laporan aktif.',
    ],
    'tambah-pemilih' => [
        'label' => 'Tambah Pemilih',
        'description' => 'Daftar pemilih manual untuk kehadiran program.',
    ],
    'program' => [
        'label' => 'Program',
        'description' => 'Cipta program dan rekod kehadiran pemilih.',
    ],
    'jawatankuasa' => [
        'label' => 'Jawatankuasa',
        'description' => 'Urus jawatan dan ahli jawatankuasa JPRD, UDM dan Cawangan.',
        'children' => [
            'jawatankuasa.kumpulan' => ['label' => 'Kumpulan'],
            'jawatankuasa.jawatan' => ['label' => 'Jawatan'],
            'jawatankuasa.senarai' => ['label' => 'Senarai Jawatankuasa'],
        ],
    ],
    'group-pemilih' => [
        'label' => 'Group Pemilih',
        'description' => 'Urus group untuk tapisan data pemilih.',
    ],
    'culaan' => [
        'label' => 'Culaan',
        'description' => 'Semak pemilih belum cula, kemas data dan tanda senarai kerja culaan.',
        'children' => [
            'culaan.senarai' => ['label' => 'Senarai Belum Cula'],
            'culaan.laporan' => ['label' => 'Laporan (Graf)'],
            'culaan.jadual' => ['label' => 'Laporan (Jadual)'],
        ],
    ],
    'settings' => [
        'label' => 'Settings',
        'description' => 'Tetapan URL Google Sheet sistem.',
        'children' => [
            'settings.backup-database' => ['label' => 'Backup Database'],
            'settings.upload-pemilih' => ['label' => 'Upload Data Pemilih'],
        ],
    ],
    'kemaskini-no-ahli' => [
        'label' => 'Kemaskini No Ahli',
        'description' => 'Benarkan kemaskini nombor ahli pemilih.',
    ],
];
