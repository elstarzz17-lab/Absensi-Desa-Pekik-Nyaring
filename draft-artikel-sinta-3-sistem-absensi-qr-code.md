# Draf Artikel Penelitian

> **Status draf:** kerangka artikel untuk dikembangkan dan diverifikasi. Ini bukan naskah siap kirim. Tanda `[WAJIB DIISI]` menandai informasi yang belum diberikan atau belum dibuktikan. Jangan mengisi hasil pengujian, wawancara, tanggal, atau identitas dengan perkiraan. Sesuaikan struktur, gaya sitasi, batas kata, dan format dengan jurnal SINTA 3 yang dituju; SINTA 3 adalah peringkat akreditasi jurnal, bukan satu templat naskah.

## Judul

**Rancang Bangun Sistem Informasi Absensi Perangkat Desa Berbasis QR Code dengan Pencatatan Lokasi: Studi Kasus Desa Pekik Nyaring**

## Identitas penulis

**[NAMA PENULIS]**<sup>1</sup>, **[NAMA PEMBIMBING/PENULIS KEDUA, JIKA ADA]**<sup>1</sup>  
<sup>1</sup>[Program Studi], [Fakultas], [Universitas], [Kota], Indonesia  
Surel: [ALAMAT SUREL AKADEMIK]

## Abstrak

Pengelolaan kehadiran perangkat desa memerlukan pencatatan yang konsisten, mudah ditelusuri, dan mendukung penyusunan rekapitulasi. Penelitian ini bertujuan merancang dan membangun sistem informasi absensi perangkat desa berbasis web dengan pemindaian QR Code pada studi kasus Desa Pekik Nyaring, Kecamatan Pondok Kelapa, Kabupaten Bengkulu Tengah. Sistem yang dikembangkan menyediakan pengelolaan data perangkat, pembuatan kartu QR, pencatatan absensi datang dan pulang, pencatatan koordinat lokasi secara opsional, riwayat absensi, serta ringkasan pada dashboard. Pemindaian QR dilengkapi masukan NIPD atau NIK sebagai jalur alternatif. Pengembangan dilakukan menggunakan [WAJIB DIISI: model pengembangan yang benar-benar diterapkan dan tahapannya]. Pengujian fungsional direncanakan dengan metode black-box berdasarkan skenario untuk autentikasi, pengelolaan data, pemindaian dan masukan manual, pencatatan absensi, riwayat, serta dashboard. Hasil pengujian aktual belum tersedia dan harus dilengkapi setelah pengujian dilaksanakan: [WAJIB DIISI: jumlah skenario, jumlah berhasil, jumlah gagal, dan temuan]. Draf ini menjelaskan ruang lingkup serta rancangan implementasi; klaim efektivitas, kelayakan, dan keberhasilan sistem belum dapat disimpulkan sebelum data pengujian dan evaluasi lapangan dilaporkan.

**Kata kunci:** absensi perangkat desa; QR Code; sistem informasi berbasis web; pengujian black-box; pencatatan lokasi

## Abstract

Village officials' attendance management requires consistent records that can be traced and summarized. This study aims to design and develop a web-based attendance information system using QR Code scanning for Pekik Nyaring Village, Pondok Kelapa District, Central Bengkulu Regency, Indonesia. The system provides official data management, QR card generation, separate check-in and check-out records, optional location-coordinate recording, attendance history, and dashboard summaries. QR scanning is accompanied by NIPD or national identity number (NIK) input as an alternative. The system was developed using [TO BE COMPLETED: the development model actually followed and its stages]. Functional testing is planned using black-box scenarios covering authentication, data management, QR scanning and manual input, attendance recording, history, and dashboard functions. Actual test results are not yet available and must be supplied after testing: [TO BE COMPLETED: number of scenarios, passed and failed cases, and findings]. This draft describes the implementation scope and design; effectiveness, suitability, and success cannot be concluded until test data and field evaluation are reported.

**Keywords:** village officials' attendance; QR Code; web-based information system; black-box testing; location recording

## 1. Pendahuluan

Pencatatan kehadiran merupakan salah satu kegiatan administrasi yang memerlukan data berurutan dan dapat ditelusuri. Dalam konteks pemerintahan desa, catatan tersebut dapat membantu petugas mengelola informasi kehadiran dan menyusun rekapitulasi. Namun, bentuk pencatatan yang sedang digunakan, kendala yang dialami, dan kebutuhan spesifik petugas Desa Pekik Nyaring belum didokumentasikan dalam bahan penelitian yang tersedia. Oleh karena itu, uraian mengenai masalah awal pada naskah ini perlu didukung observasi dan wawancara sebelum diajukan.

Teknologi QR Code dapat digunakan sebagai pembawa pengenal yang dibaca kamera perangkat. Sistem absensi berbasis QR Code telah dibahas dalam penelitian terdahulu, termasuk kajian yang menggabungkan absensi dengan teknologi biometrik dan GPS pada institusi pendidikan (Chowdhury, 2023). Konteks tersebut berbeda dari administrasi perangkat desa, sehingga rancangan dan kebutuhan pengguna pada lokasi penelitian tetap perlu dianalisis tersendiri. QR Code pada sistem ini digunakan untuk mengidentifikasi perangkat desa, sedangkan pencatatan dan penyimpanan absensi dilakukan oleh aplikasi web.

Penelitian ini berfokus pada rancang bangun sistem untuk mendukung pengelolaan data perangkat, pemindaian QR, pencatatan absensi datang dan pulang, serta penyajian riwayat dan ringkasan. Sistem juga menyediakan masukan NIPD atau NIK ketika pemindaian QR tidak dapat dilakukan dan dapat menyimpan koordinat GPS apabila izin lokasi tersedia. Pencatatan koordinat tersebut tidak dengan sendirinya membuktikan bahwa pengguna berada dalam geofence tertentu atau mencegah pemalsuan lokasi; hal itu menjadi batasan yang perlu dinyatakan.

Berdasarkan fokus tersebut, pertanyaan penelitian yang diajukan adalah: (1) bagaimana merancang dan mengimplementasikan sistem informasi absensi perangkat desa berbasis QR Code sesuai kebutuhan Desa Pekik Nyaring; dan (2) bagaimana hasil pengujian fungsional terhadap fitur utama sistem berdasarkan skenario yang ditetapkan?

Tujuan penelitian adalah menghasilkan sistem web untuk membantu proses absensi perangkat desa dan melaporkan hasil pengujian fungsionalnya secara terukur. Kontribusi yang diharapkan berupa dokumentasi rancangan dan evaluasi fungsional sistem pada konteks administrasi desa. Penelitian ini tidak mengukur peningkatan disiplin, penghematan waktu, penerimaan pengguna, maupun akurasi lokasi; klaim tersebut memerlukan rancangan evaluasi dan data tambahan.

## 2. Tinjauan Pustaka

### 2.1 Sistem informasi absensi berbasis QR Code

Sistem absensi berbasis QR Code memanfaatkan kode dua dimensi untuk membawa pengenal yang dapat dibaca kamera. Pada implementasi yang diteliti, kartu QR digunakan untuk mengirim identitas perangkat ke aplikasi, yang kemudian mencari rekaman perangkat sebelum menyimpan absensi. Penelitian Chowdhury (2023) membahas sistem manajemen absensi yang menggabungkan fingerprint, QR Code, dan GPS pada institusi pendidikan. Penelitian tersebut menjadi rujukan awal mengenai penggunaan QR pada proses absensi, tetapi tidak dapat dijadikan bukti bahwa rancangan pada konteks desa memiliki hasil atau karakteristik yang sama.

Spesifikasi simbologi QR Code diterbitkan dalam ISO/IEC 18004:2024 (International Organization for Standardization [ISO], 2024). Pada sistem ini, data QR memuat NIPD, NIK, dan nama perangkat desa dalam format terstruktur. Karena QR dapat dipindai oleh kamera yang sesuai, isi kode perlu diperlakukan sebagai data yang berpotensi diketahui pihak lain. Sebelum digunakan secara operasional, pengelola perlu menilai apakah NIK perlu disertakan; pengujian pemindaian sebaiknya menggunakan data uji atau data yang telah memperoleh persetujuan.

### 2.2 Pengujian fungsional

Pengujian black-box memeriksa keluaran sistem berdasarkan masukan dan kondisi yang ditetapkan tanpa menjadikan struktur kode sebagai fokus pengujian. Dalam penelitian ini, metode tersebut direncanakan untuk memeriksa apakah fungsi utama menerima masukan yang valid, menolak masukan yang tidak sesuai, menyimpan catatan absensi, dan menampilkan informasi yang diminta. Hasil harus dilaporkan per skenario agar pembaca dapat menilai cakupan pengujian, bukan hanya menerima pernyataan umum bahwa sistem “berhasil”.

ISO/IEC 25010:2023 menyediakan model kualitas produk yang dapat digunakan sebagai acuan dalam penetapan kebutuhan dan evaluasi kualitas perangkat lunak (ISO, 2023). Draf ini membatasi evaluasi pada kesesuaian fungsional melalui skenario pengujian. Pengujian tersebut tidak cukup untuk menyimpulkan seluruh karakteristik kualitas dalam ISO/IEC 25010, seperti keamanan, keandalan, kemudahan penggunaan, dan kinerja.

## 3. Metode Penelitian

### 3.1 Lokasi, objek, dan ruang lingkup

Penelitian berlokasi di Desa Pekik Nyaring, Kecamatan Pondok Kelapa, Kabupaten Bengkulu Tengah. Objek penelitian adalah aplikasi absensi perangkat desa berbasis web. Periode penelitian: **[WAJIB DIISI: bulan dan tahun pelaksanaan]**. Pengguna yang terlibat: **[WAJIB DIISI: peran dan jumlah responden/penguji berdasarkan pelaksanaan sebenarnya]**.

Ruang lingkup sistem yang diperiksa meliputi autentikasi admin, pengelolaan data perangkat desa, pembuatan kartu QR, pencatatan absensi datang dan pulang, input identitas secara manual, riwayat absensi, dan ringkasan dashboard. Lokasi GPS hanya dicatat apabila browser memperoleh izin dan menyediakan koordinat. Pengujian tidak mencakup geofencing, verifikasi identitas biometrik, pengujian keamanan penetrasi, dan evaluasi dampak terhadap disiplin kerja.

### 3.2 Pengumpulan kebutuhan

Sebelum menyatakan sistem sesuai kebutuhan, lakukan dan dokumentasikan:

1. **Observasi proses berjalan:** catat alur absensi aktual, media yang digunakan, pelaksana, dan dokumen rekap tanpa mengasumsikan proses manual atau kendala tertentu sebelum diverifikasi.
2. **Wawancara pengguna/pengelola:** gali kebutuhan data, aturan absensi datang dan pulang, penanganan perangkat yang tidak dapat memindai QR, akses data, serta bentuk laporan yang diperlukan.
3. **Studi dokumen:** periksa formulir, aturan kerja, atau format rekap yang memang digunakan dan telah diizinkan untuk penelitian.

Instrumen, tanggal, pihak yang diwawancarai, dan ringkasan temuan: **[WAJIB DIISI berdasarkan pelaksanaan dan persetujuan narasumber]**. Hindari memuat NIK, kata sandi, atau informasi pribadi yang tidak diperlukan di naskah.

### 3.3 Model pengembangan dan implementasi

Model pengembangan yang digunakan harus mengikuti bukti proses pengerjaan. Isi bagian ini dengan model yang benar-benar diterapkan, misalnya prototyping atau iteratif, disertai urutan kegiatan, masukan pada tiap iterasi, dan perubahan yang dilakukan. **[WAJIB DIISI: model, tahapan aktual, tanggal/iterasi, serta artefak seperti diagram dan tangkapan layar.]** Jangan menyatakan suatu model telah digunakan apabila tahapan tersebut tidak pernah dilakukan atau tidak memiliki catatan.

Implementasi aplikasi yang tersedia menggunakan Next.js 16, React 19, TypeScript, Prisma ORM, dan basis data SQLite. Antarmuka web menyediakan tab Scan QR, Dashboard, Data Perangkat, Riwayat Absensi, dan Kartu QR. QR dibuat sebagai kode berisi data perangkat; pembacaan kamera memakai pustaka pemindai QR di browser. Data perangkat dan absensi disimpan melalui API aplikasi menggunakan Prisma. Versi pustaka dan konfigurasi lingkungan penelitian perlu dicatat ulang dari lingkungan uji yang benar-benar digunakan.

Alur utama sistem adalah: admin masuk; aplikasi menampilkan modul; QR perangkat dipindai atau NIPD/NIK diketik; identitas dicari; operator memilih tipe datang atau pulang; aplikasi mengirim permintaan pencatatan; dan catatan ditampilkan pada dashboard atau riwayat. GPS bersifat opsional. Ketika izin lokasi tidak tersedia, pengujian perlu mencatat perilaku aktual aplikasi dan memastikan absensi tetap dapat dilakukan atau mencatat bahwa proses terhambat, sesuai hasil nyata.

**Gambar 1.** Diagram alur absensi. **[WAJIB DIISI: sisipkan diagram yang dibuat berdasarkan sistem aktual.]**

**Gambar 2.** Arsitektur sistem. **[WAJIB DIISI: browser/admin → aplikasi Next.js/API → Prisma → SQLite; sesuaikan jika lingkungan penerapan berbeda.]**

### 3.4 Rancangan pengujian fungsional

Pengujian direncanakan menggunakan skenario black-box. Untuk setiap kasus, catat prasyarat, data uji, langkah, keluaran yang diharapkan, keluaran aktual, status, tanggal, dan bukti. Lakukan pengujian pada salinan atau lingkungan yang aman dan jangan gunakan data pribadi tanpa otorisasi.

| ID | Fitur | Kondisi/data uji | Keluaran yang diharapkan | Hasil aktual/status |
|---|---|---|---|---|
| TC-01 | Login | Kredensial admin uji valid | Admin masuk dan modul utama tampil | [WAJIB DIISI] |
| TC-02 | Login | Kata sandi salah | Login ditolak dan pesan yang sesuai tampil | [WAJIB DIISI] |
| TC-03 | Data perangkat | Buka daftar perangkat | Daftar dan jumlah data sesuai basis data uji | [WAJIB DIISI] |
| TC-04 | Data perangkat | Tambah data dengan nama/jabatan wajib | Data tersimpan dan muncul pada daftar | [WAJIB DIISI] |
| TC-05 | Data perangkat | Simpan tanpa nama atau jabatan | Validasi menolak data tidak lengkap | [WAJIB DIISI] |
| TC-06 | Kartu QR | Buka kartu untuk satu perangkat uji | Kartu dan QR sesuai identitas uji | [WAJIB DIISI] |
| TC-07 | Absensi QR | Pindai QR valid untuk mode datang | Catatan datang tersimpan dan ditampilkan | [WAJIB DIISI] |
| TC-08 | Absensi QR | Pindai QR valid untuk mode pulang | Catatan pulang tersimpan dan ditampilkan | [WAJIB DIISI] |
| TC-09 | Input alternatif | Masukkan NIPD valid tanpa memindai QR | Identitas ditemukan dan absensi tercatat | [WAJIB DIISI] |
| TC-10 | Input alternatif | Masukkan NIK uji yang terdaftar | Identitas ditemukan dan absensi tercatat | [WAJIB DIISI] |
| TC-11 | Identitas tidak dikenal | Masukkan NIPD/NIK yang tidak terdaftar | Sistem menolak dan memberi pesan yang sesuai | [WAJIB DIISI] |
| TC-12 | GPS | Berikan izin lokasi pada browser | Koordinat/akurasi dicatat bila tersedia | [WAJIB DIISI] |
| TC-13 | GPS opsional | Tolak izin lokasi/browser tidak menyediakan koordinat | Catat perilaku aktual; jangan menyimpulkan tanpa uji | [WAJIB DIISI] |
| TC-14 | Riwayat | Filter rentang tanggal dengan catatan uji | Catatan yang sesuai rentang ditampilkan | [WAJIB DIISI] |
| TC-15 | Dashboard | Buka dashboard setelah absensi uji | Ringkasan sesuai catatan uji pada periode yang sama | [WAJIB DIISI] |

Tambahkan kasus untuk edit, perubahan status, hapus data, ekspor, pemindaian QR rusak, dan pemindaian berulang jika fungsi tersebut termasuk tujuan evaluasi. Jika ditemukan pencatatan ganda atau perilaku tidak sesuai, laporkan sebagai temuan; jangan mengubah status kasus menjadi berhasil tanpa pengujian ulang.

Persentase keberhasilan fungsional dapat dihitung sebagai:

**Persentase kasus berhasil = (jumlah kasus berstatus berhasil ÷ jumlah seluruh kasus yang dijalankan) × 100%.**

Laporkan jumlah kasus dan definisi status “berhasil” secara eksplisit. Persentase tersebut hanya merangkum kasus yang diuji; bukan bukti langsung bahwa sistem bebas kesalahan atau memenuhi seluruh kebutuhan pengguna.

## 4. Hasil dan Pembahasan

> **Bagian hasil di bawah ini belum berisi hasil empiris. Lengkapi setelah observasi, pengujian, dan validasi data selesai. Jangan mengubah placeholder menjadi angka perkiraan.**

### 4.1 Hasil analisis kebutuhan

Observasi dan wawancara pada [WAJIB DIISI: tanggal/periode] melibatkan [WAJIB DIISI: jumlah dan peran partisipan yang menyetujui keterlibatan]. Temuan yang telah diverifikasi adalah [WAJIB DIISI: uraikan kebutuhan atau masalah faktual, pisahkan hasil observasi dari pendapat narasumber]. Berdasarkan temuan tersebut, kebutuhan fungsional yang ditetapkan meliputi [WAJIB DIISI: daftar kebutuhan prioritas]. Bukti atau dokumentasi yang dapat dibagikan tanpa membuka informasi pribadi: [WAJIB DIISI].

### 4.2 Hasil implementasi

Implementasi aplikasi mencakup lima modul utama: pemindaian absensi, dashboard, data perangkat, riwayat absensi, dan kartu QR. Data absensi memiliki jenis datang atau pulang, waktu, kategori status perangkat, dan kolom koordinat serta akurasi GPS yang bersifat opsional. Sistem juga menyediakan input NIPD/NIK sebagai alternatif pemindaian. Sesuaikan uraian ini apabila versi yang diuji berbeda dari kode aplikasi saat ini.

**Gambar 3.** Halaman login. **[WAJIB DIISI: tangkapan layar dari lingkungan uji; samarkan data sensitif.]**  
**Gambar 4.** Modul scan QR dan input alternatif. **[WAJIB DIISI.]**  
**Gambar 5.** Data perangkat/dashboard/riwayat. **[WAJIB DIISI sesuai fokus hasil.]**

Basis data awal yang disediakan sebagai data seed berisi 12 rekaman contoh perangkat. Angka tersebut hanya menggambarkan isi awal basis data pengembangan yang diperiksa, bukan jumlah populasi atau sampel penelitian. Verifikasi jumlah perangkat nyata dan izin penggunaannya sebelum melaporkan data lapangan.

### 4.3 Hasil pengujian fungsional

Pengujian dilakukan pada [WAJIB DIISI: perangkat, browser, sistem operasi, konfigurasi aplikasi, dan tanggal]. Sebanyak [WAJIB DIISI] dari [WAJIB DIISI] kasus dijalankan. Hasilnya adalah [WAJIB DIISI] kasus berhasil, [WAJIB DIISI] kasus gagal, dan [WAJIB DIISI] kasus perlu diuji ulang. Persentase kasus berhasil berdasarkan rumus pada Bagian 3.4 adalah [WAJIB DIISI]%.

| Ringkasan hasil aktual | Nilai |
|---|---:|
| Jumlah kasus yang direncanakan | [WAJIB DIISI] |
| Jumlah kasus yang dijalankan | [WAJIB DIISI] |
| Berhasil | [WAJIB DIISI] |
| Gagal | [WAJIB DIISI] |
| Belum dapat disimpulkan/diulang | [WAJIB DIISI] |
| Persentase kasus berhasil | [WAJIB DIISI]% |

Kasus yang gagal dan tindak lanjut: [WAJIB DIISI: ID kasus, gejala, penyebab yang terverifikasi atau “belum diketahui”, perbaikan bila ada, dan hasil pengujian ulang]. Lampirkan tabel hasil aktual untuk seluruh skenario, bukan hanya skenario yang berhasil.

### 4.4 Pembahasan

Bahas kesesuaian implementasi terhadap kebutuhan yang benar-benar ditemukan dan hasil setiap skenario. Jika pemindaian QR berhasil pada perangkat uji, laporkan perangkat, browser, kondisi pencahayaan, jarak pemindaian, jumlah percobaan, dan definisi berhasil agar hasil dapat diulang. Jangan menggeneralisasi dari satu perangkat atau satu percobaan.

Fitur input NIPD/NIK menyediakan jalur alternatif ketika QR tidak dapat digunakan, tetapi manfaat dan kemudahan penggunaannya perlu dibuktikan lewat pengujian. Dashboard dan riwayat menyediakan penyajian catatan, namun ketepatan rekap harus dibandingkan dengan data dasar pada rentang tanggal yang sama. Waktu pencatatan dan rentang hari harus diperiksa dengan konfigurasi zona waktu yang dipakai saat penelitian.

Fitur GPS mencatat koordinat dan akurasi yang diberikan browser apabila tersedia. GPS bukan bukti tunggal bahwa seseorang hadir secara fisik di kantor, dan implementasi saat ini tidak menerapkan geofence. NIK yang dimuat ke data QR juga memerlukan penilaian privasi serta dasar pemrosesan yang sah. Pertimbangkan mengurangi data pada QR menjadi pengenal yang tidak sensitif sebelum penerapan luas.

Keterbatasan penelitian ini meliputi [WAJIB DIISI: keterbatasan yang benar-benar ditemukan]. Pengujian fungsional tidak mengevaluasi keamanan secara komprehensif, kualitas jaringan, kinerja pada beban tinggi, usability dengan instrumen tervalidasi, ataupun dampak sistem terhadap disiplin. Evaluasi lanjutan dapat mencakup uji penerimaan pengguna, kinerja, keamanan, dan uji operasional setelah protokol perlindungan data disetujui.

## 5. Kesimpulan

Penelitian ini merancang dan mengimplementasikan [WAJIB DIISI: ringkasan sistem berdasarkan versi yang diuji] untuk mendukung pengelolaan absensi perangkat desa di Desa Pekik Nyaring. Sistem mencakup [WAJIB DIISI: fitur yang benar-benar selesai dan tervalidasi]. Berdasarkan pengujian fungsional terhadap [WAJIB DIISI] skenario, diperoleh [WAJIB DIISI: hasil numerik dan kasus penting]. Dengan demikian, kesimpulan mengenai pemenuhan fungsi dibatasi pada skenario, perangkat, dan lingkungan yang diuji. Penelitian ini belum menyimpulkan peningkatan disiplin, efektivitas organisasi, keamanan menyeluruh, atau validitas lokasi.

Saran pengembangan meliputi [WAJIB DIISI berdasarkan temuan aktual], peninjauan minimisasi data pribadi di QR, serta evaluasi pengguna dan keamanan sebelum penerapan operasional yang lebih luas.

## Pernyataan dan kelengkapan naskah

- **Pendanaan:** [WAJIB DIISI atau nyatakan tidak ada setelah dikonfirmasi.]
- **Konflik kepentingan:** [WAJIB DIISI berdasarkan keadaan sebenarnya.]
- **Persetujuan/privasi:** [WAJIB DIISI: izin lokasi penelitian, persetujuan narasumber, dan perlindungan data.]
- **Ketersediaan data:** [WAJIB DIISI; jangan publikasikan data pribadi perangkat desa.]
- **Kontribusi penulis:** [WAJIB DIISI apabila penulis lebih dari satu.]
- **Target jurnal SINTA 3:** [WAJIB DIISI. Periksa status akreditasi aktif, ruang lingkup, templat, biaya, kebijakan etik, dan panduan penulis pada laman jurnal.]

## Daftar Pustaka

Chowdhury, F. Y. (2023). Implementation of attendance management system utilizing fingerprint, QR code, and GPS technology in educational institutions. *International Journal of Science and Research (IJSR), 12*(9), 2016–2019. https://doi.org/10.21275/SR23923144933

International Organization for Standardization. (2023). *ISO/IEC 25010:2023 Systems and software engineering—Systems and software Quality Requirements and Evaluation (SQuaRE)—Product quality model*. https://www.iso.org/standard/78176.html

International Organization for Standardization. (2024). *ISO/IEC 18004:2024 Information technology—Automatic identification and data capture techniques—QR code bar code symbology specification*. https://www.iso.org/standard/83389.html

> Tambahkan artikel primer terbaru dan relevan dari jurnal yang dapat diverifikasi, terutama penelitian sistem absensi untuk layanan publik/desa, evaluasi sistem sejenis, serta metode pengembangan dan pengujian yang benar-benar digunakan. Verifikasi metadata, DOI, isi sumber, dan kecocokan gaya sitasi melalui laman penerbit sebelum pengiriman.

## Checklist sebelum diajukan

- [ ] Ganti semua `[WAJIB DIISI]` dengan informasi dan data yang benar-benar diperoleh.
- [ ] Laksanakan dan dokumentasikan pengumpulan kebutuhan serta pengujian; jangan laporkan rencana sebagai hasil.
- [ ] Cocokkan deskripsi sistem dengan versi aplikasi yang diuji.
- [ ] Minta persetujuan yang diperlukan dan anonimisasi identitas maupun NIK.
- [ ] Tambahkan tinjauan pustaka dari sumber primer yang relevan dan benar-benar dibaca.
- [ ] Sesuaikan format, struktur, panjang naskah, bahasa abstrak, dan sitasi dengan jurnal SINTA 3 tertentu.
- [ ] Minta pembimbing memeriksa metodologi, etik penelitian, interpretasi, dan kebaruan sebelum pengajuan.
