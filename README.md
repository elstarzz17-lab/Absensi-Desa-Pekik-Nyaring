# Absensi Perangkat Desa Pekik Nyaring

Aplikasi PHP mandiri untuk hosting Apache/PHP seperti InfinityFree. Halaman utama `index.php` berada di repository root; aplikasi tidak memerlukan Next.js, Node.js, npm, atau Composer.

## Pasang di InfinityFree

1. Buat database MySQL dari panel hosting dan catat host, nama database, username, dan password.
2. Salin `config.example.php` menjadi `config.php`, lalu isi kredensial database dan token setup acak.
3. Aktifkan HTTPS, lalu unggah **isi** repository atau ZIP khusus hosting ke `htdocs`. Pastikan `index.php`, `.htaccess`, `assets/`, `lib/`, dan `runtime/` berada langsung di dalam `htdocs`.
4. Buka situs dan ikuti **Penyiapan pertama kali** untuk membuat akun admin. Simpan token secara privat dan kosongkan setelah setup selesai.

Jangan unggah atau publikasikan `config.php`. Database perangkat dan absensi tidak disertakan; tambahkan data melalui aplikasi setelah setup.

Petunjuk lengkap dan batasan hosting: [DEPLOYMENT.md](./DEPLOYMENT.md).

## Pengembangan dan pengujian

Antarmuka tidak memerlukan build frontend. Pengujian ekspor Excel lokal:

```powershell
php tests/xlsx_export_test.php
```
