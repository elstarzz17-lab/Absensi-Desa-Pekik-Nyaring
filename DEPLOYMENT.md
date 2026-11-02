# Absensi Pekik Nyaring — PHP dan InfinityFree

Repository publik ini berisi aplikasi PHP mandiri untuk hosting seperti InfinityFree. `index.php` beserta API tidak memerlukan Next.js, Node.js, npm, Composer, atau berkas dari folder lain.

Anda dapat mengunggah isi repository ke `htdocs`, atau menggunakan ZIP khusus InfinityFree agar hanya berkas aplikasi yang dikirim.

## 1. Buat database pada panel hosting

1. Buat database MySQL dari panel InfinityFree dan catat **host**, **nama database lengkap dari provider**, **username**, dan **password**. Jangan mengubah awalan nama yang diberikan provider (sering kali nama database tidak sama dengan nama pendek pilihan Anda).
2. Database tersebut harus sudah dibuat dari panel. Installer aplikasi **tidak** menjalankan `CREATE DATABASE` dan tidak membuat database baru; ia hanya membuat tabel aplikasi di database terpilih.
3. Pastikan ekstensi PHP `PDO MySQL`, `mbstring`, dan `ZipArchive` aktif. Aplikasi bisa tetap menyediakan ekspor CSV jika `ZipArchive` tidak tersedia.

## 2. Atur kredensial dan token setup secara privat

1. ZIP InfinityFree terbaru menyertakan `config.php` sebagai template. Edit file itu di komputer sebelum mengunggah dan isi `db_host`, `db_name`, `db_user`, serta `db_password` persis seperti di panel hosting. Jika mengambil source dari GitHub, salin `config.example.php` menjadi `config.php`.
2. Ganti `setup_token` dengan sedikitnya 32 byte acak (64 karakter hex). Contoh membuat token dengan PowerShell lokal:

   ```powershell
   $bytes = New-Object byte[] 32
   [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
   [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
   ```

3. Jangan menaruh token di URL, Git, tiket publik, atau tangkapan layar. `config.php` sengaja dikecualikan Git dan dilindungi aturan `.htaccess`; simpan salinan cadangannya di tempat privat.
4. Unggah dan ekstrak **isi ZIP InfinityFree** ke `htdocs`, termasuk `config.php`, `index.php`, `.htaccess`, `assets/`, `lib/`, dan `runtime/`. Pastikan `index.php` berada langsung di `htdocs` (bukan di subfolder ZIP). Pastikan direktori `runtime/` dapat ditulis PHP dan tidak dapat diakses web (aturan deny sudah disertakan).

**Jangan unggah konfigurasi template tanpa mengisinya terlebih dahulu.** Jika halaman menampilkan pesan bahwa konfigurasi masih berisi contoh, edit `config.php` dengan data database dari panel hosting. Aplikasi PHP ini memakai `config.php`; berkas `.env` tidak dibaca.

## 3. Buat admin pertama kali

1. Aktifkan HTTPS/SSL situs dari panel hosting sebelum memasukkan token atau kata sandi admin.
2. Buka situs dan pilih **Penyiapan pertama kali** pada layar masuk. Masukkan token setup dari `config.php`, nama pengguna admin, dan kata sandi admin baru minimal 12 karakter.
3. Installer memeriksa token dengan perbandingan aman, membuat tabel `Admin`, `PerangkatDesa`, `Absensi`, dan `AppMeta` hanya di database yang sudah ada, menyimpan kata sandi dengan `password_hash()`, lalu mengunci setup di `AppMeta`. Tidak ada admin/kredensial default. Setup tidak dapat digunakan kembali, termasuk bila akun admin kemudian dihapus.
4. Segera kosongkan nilai `setup_token` (`'setup_token' => ''`) di `config.php` atau ganti dengan string acak baru dan simpan config di lokasi privat. Token yang tersisa tetap tidak dapat membuka installer setelah database menandai setup selesai.
5. Masuk dengan admin baru. Tambahkan perangkat; NIPD dibentuk dari nama dan tanggal lahir atau tanggal lahir pada NIK. NIK tidak harus dipajang di UI publik, tetapi API dan kartu QR admin menggunakannya bila tersedia.

Jika lebih memilih phpMyAdmin, pilih database provider yang sudah dibuat lalu jalankan pernyataan `CREATE TABLE` pada fungsi `createSchema()` di `lib/database.php`, kemudian tetap gunakan installer bertoken untuk membuat admin. Jangan membuat tabel admin dengan kata sandi teks biasa.

Database MySQL InfinityFree yang baru tidak otomatis berisi data dari SQLite/XAMPP lokal. Paket ini sengaja tidak menyertakan database perangkat dan absensi pribadi. Setelah pemasangan, tambahkan data melalui menu **Data Perangkat**; riwayat lokal lama hanya dapat dipindahkan lewat proses migrasi terpisah setelah format dan tujuan databasenya disiapkan. Cadangkan data lama sebelum memindahkannya.

## Keamanan sesi/API

- Login berhasil meregenerasi ID sesi dan menetapkan cookie `ABSENSI_SESSID` dengan `HttpOnly`, `SameSite=Lax`, dan `Secure` ketika HTTPS aktif.
- `/api/auth/session` memeriksa sesi server-side; `/api/auth/logout` menghapusnya. Dashboard, perangkat, riwayat, absensi, dan ekspor menolak permintaan tanpa sesi admin. Perubahan data memerlukan token CSRF sesi dan pemeriksaan origin.
- Hanya endpoint login, pemeriksaan status setup, dan setup satu kali yang tidak memerlukan sesi admin. UI tidak menyimpan autentikasi di `localStorage`.
- `.htaccess` memblokir akses web ke file konfigurasi dan `runtime/`. Jangan menghapus perlindungan tersebut. Cookie `Secure` baru aktif bila situs benar-benar diakses melalui HTTPS.

## Fitur dan batasan hosting

- Lima menu berbahasa Indonesia: pemindai QR, dashboard, data perangkat (cari/tambah/ubah/hapus/status), riwayat dan filter tanggal, serta kartu QR untuk unduh/cetak.
- Pemindai memakai `BarcodeDetector` bawaan browser bila tersedia. NIK/NIPD manual selalu tersedia sebagai alternatif, tanpa memerlukan kamera.
- Generator kartu QR disertakan lokal di `assets/qrcode.min.js` (lisensi pada `assets/qrcode-LICENSE.txt`); tidak ada permintaan ke CDN atau layanan eksternal.
- Ekspor `.xlsx` dibuat dengan ekstensi PHP `ZipArchive` dan tidak memerlukan Composer. Jika ekstensi/penulisan runtime tidak tersedia, UI menjelaskan masalah lalu mengunduh CSV sebagai alternatif.
- XLSX berisi tiga lembar: `Rekap Bulanan` (sel kalender D/DP/P, total hadir/lengkap/tidak hadir dan rekap per hari), `Riwayat Absensi` (digabung per perangkat dan tanggal, termasuk jam/GPS), serta `Data Perangkat Desa`.
- Validasi paket XLSX lokal (SQLite fixture, ekstensi ZIP/XML PHP): `php tests/xlsx_export_test.php`.
- Untuk memindai QR memakai kamera, akses situs melalui HTTPS dan izinkan akses kamera di browser.
- Direktori `runtime/` hanya dipakai untuk file XLSX sementara, yang dihapus setelah dikirim. Bila hosting tidak mengizinkan penulisan, gunakan CSV.

## Isi paket

- `index.php`: halaman utama PHP dan router `/api/*`.
- `lib/api.php`: API absensi, login, sesi/CSRF, installer sekali pakai, dashboard, CRUD, dan ekspor XLSX.
- `lib/database.php`, `lib/nipd.php`: koneksi ke database yang sudah dibuat, skema tabel, dan pembentukan NIPD.
- `config.example.php`: template konfigurasi tanpa kredensial.
- `.htaccess`: front-controller/rewrite dan perlindungan konfigurasi.
- `assets/`: CSS, JavaScript aplikasi, dan generator QR yang dibundel.
