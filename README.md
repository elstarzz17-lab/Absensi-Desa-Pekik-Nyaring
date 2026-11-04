# Absensi Perangkat Desa Pekik Nyaring

Aplikasi PHP mandiri untuk hosting Apache/PHP seperti InfinityFree. Halaman utama `index.php` berada di repository root; aplikasi tidak memerlukan Next.js, Node.js, npm, atau Composer.

## Pasang di InfinityFree

1. Buat database MySQL dari panel hosting dan catat host, nama database, username, dan password.
2. Salin `config.example.php` menjadi `config.php`. Isi kredensial database dari panel hosting dan token setup acak sebelum mengunggah.
3. Aktifkan HTTPS, lalu unggah **isi** repository atau ZIP khusus hosting ke `htdocs`, termasuk `config.php` yang telah diisi. Pastikan `index.php`, `.htaccess`, `assets/`, `lib/`, dan `runtime/` berada langsung di dalam `htdocs`.
4. Buka situs dan ikuti **Penyiapan pertama kali** untuk membuat akun admin. Simpan token secara privat dan kosongkan setelah setup selesai.

Database dibuat lebih dahulu dari panel hosting; pada setup pertama aplikasi membuat tabelnya. Database dan kredensial asli tidak mungkin disertakan dalam ZIP karena bersifat privat. File `config.php` pada ZIP hosting hanya template dan tidak akan tersambung sebelum Anda mengisinya.

PHP hosting membaca `config.php`, bukan `.env`. Jangan membuat atau mengunggah `.env` untuk aplikasi ini. Jangan publikasikan `config.php` yang sudah diisi. Database perangkat dan absensi tidak disertakan; tambahkan data melalui aplikasi setelah setup.

Absensi dilakukan oleh admin melalui pemindai QR di halaman utama. Pemindai QR dibundel bersama aplikasi dan tidak bergantung pada dukungan `BarcodeDetector` bawaan browser.

Petunjuk lengkap dan batasan hosting: [DEPLOYMENT.md](./DEPLOYMENT.md).

## Pengembangan dan pengujian

Antarmuka tidak memerlukan build frontend. Pengujian ekspor Excel lokal:

```powershell
php tests/xlsx_export_test.php
```
