# Absensi Perangkat Desa Pekik Nyaring

Aplikasi absensi untuk hosting Apache/PHP seperti InfinityFree. `index.html` adalah halaman aplikasi statis; JavaScript-nya menggunakan API PHP di origin yang sama, dengan data disimpan di MySQL. `index.php` tetap menangani API dan menjadi fallback Apache. Aplikasi tidak memerlukan Next.js, Node.js, npm, atau Composer.

## Pasang di InfinityFree

1. Buat database MySQL dari panel hosting dan catat host, nama database, username, dan password.
2. Pada ZIP InfinityFree, edit file `config.php` yang sudah disertakan. Jika mengunduh source dari GitHub, salin `config.example.php` menjadi `config.php`. Isi kredensial database dari panel hosting dan token setup acak sebelum mengunggah.
3. Aktifkan HTTPS, lalu unggah atau ekstrak **isi ZIP InfinityFree langsung ke** `htdocs` (bukan folder ZIP-nya). Pastikan `index.html`, `index.php`, `.htaccess`, `assets/`, `lib/`, dan `runtime/` berada langsung di dalam `htdocs`. `index.html` menjadi halaman masuk; `.htaccess` meneruskan `/api/*` ke backend PHP di `index.php`.
4. Buka situs dan ikuti **Penyiapan pertama kali** untuk membuat akun admin. Simpan token secara privat dan kosongkan setelah setup selesai.

Database dibuat lebih dahulu dari panel hosting; pada setup pertama aplikasi membuat tabelnya. Database dan kredensial asli tidak mungkin disertakan dalam ZIP karena bersifat privat. File `config.php` pada ZIP hosting hanya template dan tidak akan tersambung sebelum Anda mengisinya.

PHP hosting membaca `config.php`, bukan `.env`. Jangan membuat atau mengunggah `.env` untuk aplikasi ini. Jangan publikasikan `config.php` yang sudah diisi. Database perangkat dan absensi tidak disertakan; tambahkan data melalui aplikasi setelah setup.

Petunjuk lengkap dan batasan hosting: [DEPLOYMENT.md](./DEPLOYMENT.md).

## Pengembangan dan pengujian

Antarmuka tidak memerlukan build frontend. Pengujian ekspor Excel lokal:

```powershell
php tests/xlsx_export_test.php
```
