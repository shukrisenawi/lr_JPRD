<?php

return [
    'dashboard' => [
        'label' => 'Dashboard',
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
            'jawatankuasa.senarai' => ['label' => 'Senarai Jawatankuasa'],
            'jawatankuasa.jawatan' => ['label' => 'Jawatan'],
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
    ],
    'kemaskini-no-ahli' => [
        'label' => 'Kemaskini No Ahli',
        'description' => 'Benarkan kemaskini nombor ahli pemilih.',
    ],
];
