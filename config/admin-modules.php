<?php

return [
    'laporan' => [
        'label' => 'Laporan',
        'description' => 'Lihat dan muat naik laporan pemilih.',
    ],
    'dashboard' => [
        'label' => 'Cula Manual',
        'description' => 'Paparan utama dan ringkasan status semasa.',
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
    'jawatankuasa.laporan' => [
        'label' => 'Senarai AJK',
        'description' => 'Senarai AJK mengikut peringkat.',
    ],
    'jawatankuasa.senarai-udm' => [
        'label' => 'Senarai AJK UDM',
        'description' => 'Senarai kumpulan jawatan dan ahli jawatankuasa untuk UDM semasa.',
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
    'culaan-bot' => [
        'label' => 'Culaan Bot',
        'description' => 'Kemas data culaan pemilih melalui Telegram Bot secara ringkas.',
    ],
    'settings' => [
        'label' => 'Settings',
        'description' => 'Tetapan URL Google Sheet sistem.',
        'children' => [
            'settings.backup-database' => ['label' => 'Backup Database'],
            'settings.upload-pemilih' => ['label' => 'Upload Data Pemilih'],
            'settings.google-sheet' => ['label' => 'URL Google Sheet'],
        ],
    ],
    'kad-ten' => [
        'label' => 'Kad 10',
        'description' => 'Agih pemilih di bawah ketua untuk tugasan.',
    ],
    'vcc' => [
        'label' => 'VCC',
        'description' => 'Senarai semua pemilih VCC.',
    ],
    'kemaskini-no-ahli' => [
        'label' => 'Kemaskini No Ahli',
        'description' => 'Benarkan kemaskini nombor ahli pemilih.',
    ],
    'pusat-khidmat' => [
        'label' => 'Pusat Khidmat',
        'description' => 'Data Pusat Khidmat dari Google Sheet.',
    ],
    'api-keys' => [
        'label' => 'Kunci API',
        'description' => 'Urus kunci API untuk integrasi sistem luaran.',
    ],
];
