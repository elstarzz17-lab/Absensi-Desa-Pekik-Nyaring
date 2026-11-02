# Backend PHP dan MariaDB/MySQL

Antarmuka Next.js tetap digunakan. Endpoint `/api/*` diteruskan ke REST API PHP, dan data aplikasi disimpan di MariaDB/MySQL melalui PDO. XAMPP menyediakan MariaDB untuk pengembangan lokal.

## Persyaratan

- PHP 8.2 atau lebih baru dengan ekstensi `pdo_mysql`, `pdo_sqlite`, `mbstring`, `gd`, `zip`, `xml`, dan `fileinfo`.
- XAMPP MariaDB/MySQL berjalan pada port `3306`.
- Node.js dan dependensi proyek telah dipasang.

Konfigurasi lokal XAMPP yang baru dipasang biasanya memakai akun `root` tanpa kata sandi. Itu hanya untuk pengembangan lokal. Untuk penggunaan nyata, atur kata sandi database dan jalankan aplikasi dengan akun database khusus yang hanya memiliki hak pada database aplikasi.

Pengaturan koneksi dibaca dari environment:

| Variabel | Default lokal |
|---|---|
| `ABSENSI_DB_HOST` | `127.0.0.1` |
| `ABSENSI_DB_PORT` | `3306` |
| `ABSENSI_DB_NAME` | `absensi_pekik_nyaring` |
| `ABSENSI_DB_USER` | `root` |
| `ABSENSI_DB_PASSWORD` | kosong |
| `SQLITE_MIGRATION_PATH` | `db/custom.db` di root proyek |
| `PHP_API_ORIGIN` | `http://127.0.0.1:8000` |

## Menyiapkan database pertama kali

1. Buka XAMPP Control Panel dan nyalakan **MySQL** (MariaDB).
2. Dari PowerShell di root proyek, jalankan:

   ```powershell
   npm run php:setup
   ```

3. Skrip membuat database dan tabel, lalu mengimpor admin, perangkat desa, dan absensi dari `db/custom.db` bila file tersebut tersedia. Kata sandi admin lama diubah menjadi hash pada database baru. Proses dapat dijalankan kembali; baris yang sama diperbarui, bukan digandakan.
4. Pasang dependensi ekspor Excel dari folder `php-api` jika vendor belum tersedia:

   ```powershell
   Set-Location php-api
   composer install --no-interaction
   Set-Location ..
   ```

5. Jalankan aplikasi dan API PHP bersama:

   ```powershell
   npm run dev
   ```

   Buka `http://localhost:3000`. Untuk server produksi lokal setelah build, gunakan `npm run start`.

## NIPD dan ekspor Excel

NIPD perangkat baru dibentuk otomatis dengan format seperti `NIPD-RA-41@06081985-A1B2`: kode tiga inisial nama, umur saat NIPD dibuat, tanggal lahir `DDMMYYYY`, serta kode acak singkat agar tetap unik. Tanggal lahir dibaca dari kolom Tempat/Tanggal Lahir (contoh `Bengkulu, 06-08-1985`) atau, bila tidak ada, dari NIK 16 digit. NIPD tidak berubah saat data nama/tanggal lahir diedit. Karena NIPD memuat data umur dan tanggal lahir, batasi distribusi kartu QR dan ekspor.

Untuk memperbarui NIPD perangkat lama yang tanggal lahirnya tersedia pada kolom tersebut atau dapat dibaca dari NIK:

```powershell
npm run php:nipd
```

Perangkat tanpa tanggal lahir yang valid dilewati dan mempertahankan NIPD lamanya; lengkapi tanggal lahir atau NIK, lalu jalankan perintah kembali bila ingin diperbarui. Perubahan NIPD berarti kartu QR lama harus dicetak ulang.

Ekspor `/api/absensi/export?from=YYYY-MM-DD&to=YYYY-MM-DD` berisi tiga lembar: rekap bulanan dengan kalender dan rekap hadir per hari, riwayat absensi, serta data perangkat desa. Tata letak, legenda, warna hari libur, dan kolom mengikuti workbook contoh yang diberikan.

## Admin dan keamanan

Migrasi lokal membawa akun admin yang sudah ada dan menyimpan kata sandinya menggunakan hash. Untuk mengganti/membuat akun admin, atur variabel berikut di PowerShell, lalu jalankan `npm run php:admin`:

```powershell
$env:ABSENSI_ADMIN_USERNAME = "admin-baru"
$env:ABSENSI_ADMIN_PASSWORD = "gunakan-kata-sandi-kuat-minimal-12-karakter"
npm run php:admin
Remove-Item Env:ABSENSI_ADMIN_PASSWORD
Remove-Item Env:ABSENSI_ADMIN_USERNAME
```

Jangan membuka XAMPP/phpMyAdmin atau server pengembangan ini ke internet. Sebelum deployment, gunakan HTTPS, akun database khusus dengan kata sandi kuat, pengelolaan rahasia yang tidak disimpan di repository, serta kebijakan perlindungan NIK dan data lokasi. Periksa dan batasi hak akses API; autentikasi UI berbasis localStorage yang ada bukan pengganti otorisasi server.

## Endpoint yang memakai PHP

- `POST /api/auth/login` dan `POST /api/auth/setup`
- `GET|POST /api/perangkat`
- `PUT|DELETE /api/perangkat/{id}`
- `GET|POST /api/absensi`
- `GET /api/dashboard`
- `GET /api/absensi/export` (XLSX)

Endpoint QR Code yang tidak membutuhkan akses database tetap ditangani Next.js.
