# JPRD UDM Monitor

Aplikasi Windows berasingan untuk memaparkan jadual culaan UDM daripada sistem web JPRD.

## Cara guna

1. Login ke sistem web sebagai master admin.
2. Buka menu `Pentadbiran > Generate API Key`.
3. Cipta API key, contohnya `UDM Monitor PC`.
4. Jalankan aplikasi Windows ini.
5. Masukkan URL sistem `https://paskawasansik.com` dan API key.
6. Aplikasi akan refresh data setiap 10 saat.

API key dihantar melalui header `Authorization: Bearer ...`. Key disimpan menggunakan Windows secure storage apabila tersedia.

## Development

```powershell
npm install
npm start
```

## Bina installer Windows

```powershell
npm run dist
```

Fail installer berada dalam `desktop/release/installer/` dan portable `.exe` dalam `desktop/release/portable/`.
