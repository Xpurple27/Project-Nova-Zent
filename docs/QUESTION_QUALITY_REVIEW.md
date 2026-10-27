# NOVA ZENITH — audit dan revisi kualitas soal

Tanggal: **27 Oktober 2026**. Baseline repository: `61ea1b0f9c7778123bf882108452b5135b30fecf`.

## Hasil konten

Publikasi privat diperbarui menjadi **720 soal yang direview**, tetap 60 per kombinasi role/jenjang dan 20 per tingkat kesulitan. Revisi mengganti publikasi aktif dengan identitas konten baru; riwayat soal lama dipertahankan. Database tetap memakai `content_version=production-v1` untuk kompatibilitas loader. Metadata `explanation_json.qualityVersion=3` membedakan review terbaru.

| Pemeriksaan | Sebelum | Sesudah |
|---|---:|---:|
| Soal aktif | 720 | 720 |
| Pool jenjang/role | 12 | 12 |
| Soal per Easy/Medium/Hard di tiap pool | 20 | 20 |
| Opsi berupa empat angka berurutan dengan selisih satu | 591 | 1 |
| Pengecoh dengan jejak hitungan dan alasan miskonsepsi | Tidak diwajibkan tooling | 2.160 |
| Posisi kunci sebelum pengacakan server | Tidak seimbang | 180 pada setiap posisi |
| Ekspresi prompt/opsi/pembahasan yang berhasil dirender KaTeX | Prompt belum memakai markup | 3.581 |

Satu kasus opsi berurutan dipertahankan karena secara sah menguji jumlah bilangan bulat pada interval, dengan pengecoh berupa batas inklusif/eksklusif yang keliru. Tidak digunakan generator pengecoh umum `jawaban±1` untuk mengisi bank.

Baseline lolos pemeriksaan ekspresi jawaban terhadap kunci; temuan utamanya bukan bukti bahwa semua kunci lama salah. Masalahnya adalah opsi yang mudah dieliminasi, tier yang sering hanya dibedakan melalui perubahan angka, dan penulisan rumus yang belum terstruktur.

## Definisi kesulitan

| Tingkat | Beban yang dituju | Timer server tetap | Estimasi authoring |
|---|---|---:|---:|
| Easy | Satu konsep familiar atau substitusi langsung; pernyataan singkat | 12 detik | 8,5 detik |
| Medium | Dua tahap terkait, besaran antara, atau pemilihan basis/ruang sampel yang benar | 18 detik | 14 detik |
| Hard | Beberapa tahap terkait, pembalikan proses, atau kendala/kasus tambahan | 25 detik | 21,5 detik |

Estimasi merupakan perkiraan editorial, **bukan waktu hasil uji siswa**. Tier bersifat relatif terhadap jenjang. SD terutama prasyarat kelas 4–6, SMP kelas 7–9, dan SMA rentang kelas 10–12; satu pilihan jenjang bukan diagnosis kurikulum tiap tahun sekolah.

Perbedaan antar-tier tidak cukup berupa bilangan yang lebih besar. Contohnya, pola berulang berkembang dari menentukan satu suku menjadi menjumlah dua suku berdasarkan posisi siklus, lalu menjumlah beberapa siklus lengkap dan sisanya. Persentase berkembang dari satu perubahan menjadi basis berturut-turut, lalu membalik rangkaian perubahan.

| Jenjang / role | Fokus Easy | Fokus Medium | Fokus Hard |
|---|---|---|---|
| SD Warrior | Operasi langsung, kelompok sama banyak | Urutan operasi, bilangan hilang, rata-rata | Beberapa operasi, rasio dan sisa pembagian |
| SD Mage | Luas, keliling, volume dasar | Dimensi dari rumus, konversi sebelum perhitungan | Bidang gabungan, ruang kosong, perjalanan bertahap |
| SD Thief | Aturan pola eksplisit dan pilihan sederhana | Menentukan beda, dua posisi siklus, ruang sampel | Relasi beberapa kotak, jumlah pola, jaminan terburuk |
| SD Healer | Persen bagian, pecahan, satuan | Bagian tersisa, resep, harga setelah diskon | Kapasitas dari perubahan bagian, basis persen dan waktu lintas hari |
| SMP Warrior | Bilangan bertanda dan proporsi langsung | Operasi terkait, persamaan dan perubahan rata-rata | Pecahan gabungan, rasio berantai, jumlah berbobot |
| SMP Mage | Substitusi dan persamaan langsung | Substitusi kuadrat, invers dan dimensi | Persamaan pecahan, komposisi, bingkai dan geometri bertahap |
| SMP Thief | Suku barisan dan peluang satu tahap | Parameter barisan, dua pengambilan, irisan | Peluang dua urutan, kendala kode dan relasi beberapa kotak |
| SMP Healer | Satu perubahan persen, laju dan kebutuhan satuan | Basis berubah, campuran dan perbandingan berbalik | Membalik proses, pekerjaan tersisa, debit bersih |
| SMA Warrior | Hukum pangkat/log dan numerik langsung | Gabungan hukum pangkat, statistik berbobot | Batas pertidaksamaan, beberapa representasi pangkat, pemulihan indeks |
| SMA Mage | Fungsi langsung, akar terfaktor, sudut istimewa | Komposisi, akar kuadrat dan titik minimum | Invers komposisi, persamaan log, identitas dan bentuk rasional |
| SMA Thief | Pasangan tanpa urutan, kejadian dasar | Tim tiga anggota, normalisasi bersyarat, jumlah geometri | Komposisi tim, dua kasus digit, tiga himpunan dan peluang bersyarat bertahap |
| SMA Healer | Satu pertumbuhan/peluruhan, bagian dan batas | Majemuk, konsentrasi berbobot, laju gabungan | Membalik pertumbuhan, pengenceran, basis pemulihan dan sisa waktu |

Bank menggunakan 84 kelompok konsep dalam konteks role/jenjang, dengan 252 bentuk bertingkat dan dua atau tiga variasi parameter per bentuk. Ini **bukan klaim 720 topik atau metode penyelesaian yang seluruhnya berbeda**.

## Pengecoh dan penulisan

Setiap opsi salah mempunyai `optionId`, `misconception`, dan `valueExpression` privat. Contoh jenis kesalahan yang diperiksa:

- Menjumlah sebelum mengalikan, atau mengabaikan tanda kurung.
- Menggunakan keliling sebagai luas dan volume sebagai luas permukaan.
- Menghitung HP yang hilang ketika yang ditanya HP tersisa.
- Menggunakan persentase dari basis lama setelah nilai berubah.
- Menggunakan `n` alih-alih `n−1`, atau tertukar jumlah dan suku terakhir.
- Menganggap urutan tidak penting pada kode, atau penting pada tim tanpa jabatan.
- Tidak memperbarui ruang sampel setelah pengambilan tanpa pengembalian.
- Membalik proses dengan urutan yang salah.

Opsi numerik ditulis seragam sebagai TeX. Pecahan disederhanakan dengan aritmetika rasional eksak; dua representasi angka yang sama tidak boleh menjadi dua opsi. Soal peluang yang diberi domain peluang menolak opsi di luar 0–1; soal ber-domain cacahan menolak nilai negatif/pecahan. Konteks ramuan yang menyerupai dosis diberi label fantasi, bukan instruksi medis.

## Pemeriksaan matematika dan batas buktinya

- 720/720 ekspresi solusi cocok dengan opsi yang dikunci.
- 2.160/2.160 ekspresi kesalahan cocok dengan opsi pengecohnya.
- Nol opsi ekuivalen yang menghasilkan dua jawaban benar.
- 132 jawaban dihitung ulang dari prompt yang ditampilkan oleh parser independen terbatas: operasi eksplisit, persamaan linear, waktu, relasi kotak, dan konsentrasi.
- 588 prompt lainnya diperiksa melalui review editorial bentuk soal dan derivasi authoring; parser tidak mengklaim memahami seluruh soal cerita.
- 3.581 ekspresi TeX lolos renderer dengan `throwOnError:true`, `strict:error`, dan `trust:false`.
- Nol prompt duplikat setelah normalisasi whitespace dan huruf kecil.

Review dilakukan oleh agent. **Review guru independen dan kalibrasi waktu/kesulitan menggunakan siswa belum dilakukan.** Ketepatan format dan hitungan tidak otomatis membuktikan kesulitan psikometrik yang sama antar-role.

## Integrasi dan keamanan

Tidak ada perubahan rumus damage/healing, pemetaan skill ke difficulty, timer, Perfect/Success/Failed, urutan resolution, reconnect, atau progression. Warrior dan Healer saat ini meminta Easy/Medium menurut konfigurasi skill yang dikunci; pool Hard tetap direview dan tersedia dalam katalog, tetapi tidak dipaksakan ke skill mereka melalui revisi konten ini.

`nz_question_import_v2` mempublikasikan seluruh bank di dalam satu transaksi. Publikasi menggunakan advisory lock yang sama dengan importer, memeriksa baseline, dan membandingkan checksum prompt/opsi/kunci riwayat sebelum serta sesudah import. Seluruh 720 identitas konten lama tetap ada. Tidak ada penghapusan assignment atau perubahan soal yang sedang dikerjakan.

Assignment menyimpan prompt, opsi, token kunci privat dan deadline ketika dibuat. Penggantian bank tidak mengganti assignment berjalan; hal ini memiliki regression test. Browser hanya menerima proyeksi aman dan mengirim token opsi. Pembahasan, kunci, metadata pengecoh dan ekspor bank tetap berada pada schema privat, bukan Git/frontend.

KaTeX 0.19.1 dipasang dengan versi terkunci. CSS dan font dilayani aplikasi. `MathText` merender secara deklaratif dengan HTML+MathML, tanpa polling global `window.katex` atau race dengan CDN. Parsing membedakan teks biasa, inline dan display math. Formula rusak mempunyai fallback teks yang di-escape; publikasi tetap menolak sintaks rusak sebelum import.

## Perintah pemeriksaan

```bash
node --import tsx scripts/validate-question-bank.ts PRIVATE_JSON --school --quality
python scripts/audit-question-math.py PRIVATE_JSON
npm run typecheck
npm run lint
npm test
npm run check:edge
VERCEL_ENV=production NOVA_ENABLE_OFFLINE_DEMO=1 NEXT_TELEMETRY_DISABLED=1 npm run build
npm run test:e2e -- --workers=4
```

Auditor Python memakai pustaka standar Python 3; pengujian dapat memilih executable dengan `NOVA_QA_PYTHON`. Semua input/output konten dan SQL import harus tetap privat. Jalankan semua validator sebelum `--write-sql=PRIVATE_SQL`, lalu import melalui koneksi pemilik yang terotorisasi.

## Verifikasi aplikasi

Typecheck, lint, 111 unit/integration tests dan pemeriksaan bundle Edge lulus. Production build lokal berhasil. Seluruh **49 browser tests** lulus setelah test baru menunggu penyelesaian request asinkron yang benar; tidak ada assertion regresi lama yang dihapus.

Browser mencakup 320/360/375/390/412px dan desktop 1280px, pecahan dan pangkat tanpa CDN, MathML, target sentuh, token jawaban, refresh/deadline, dropdown jenjang, skill/reaction, hasil encounter, serta penyajian empat pandangan terisolasi. Emulator Chromium digunakan; **perangkat Android/iOS fisik dan satu run live empat perangkat dengan hCaptcha tidak diuji ulang dalam perubahan konten ini**.

Hasil SQL produksi dan deployment dicatat setelah verifikasi akhir pada [QUESTION_BANK_QA_REPORT.md](QUESTION_BANK_QA_REPORT.md).
