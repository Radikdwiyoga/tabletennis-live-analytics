# PRD – TableTennis Live Analytics

Oct 28, 2026 · @Radik

## Ringkasan

TableTennis Live Analytics adalah web app yang membaca kamera HP atau laptop saat orang main pingpong, lalu menampilkan statistik di atas video secara langsung: posisi pemain, jumlah pukulan, panjang reli, dan peta meja. Pemrosesan live jalan di browser, tanpa server.

**Tujuan**

- Proyek pribadi untuk dipakai sendiri saat latihan dan main santai.
- Tampilan overlay mirip reel analitik badminton: panel kecil di pojok, label P1 dan P2, peta meja.
- Bisa merekam sesi langsung dari web, lalu melihat rekap setelahnya.

**Prinsip**

1. Live dulu, akurat belakangan. Overlay ringan yang lancar lebih penting daripada model berat yang patah-patah.
2. MVP jalan penuh di browser. Backend Python baru ditambah kalau memang dibutuhkan.
3. Video dan data tetap di perangkat pengguna.
4. Dibangun bertahap. Setiap fase harus bisa dicoba sendiri sebelum lanjut.

## Masalah dan pengguna

Main pingpong biasanya hanya dinilai dari skor. Pemain tidak punya gambaran berapa lama reli, di mana bola sering mendarat, atau bagaimana posisi berdirinya. Alat analitik yang ada mahal atau butuh perangkat khusus.

**Pengguna**

- Utama: pemilik proyek, main 1 lawan 1 dengan teman, kamera HP di tripod.
- Kemungkinan lanjutan: teman satu klub yang ingin melihat rekap sesinya.

**Skenario pemakaian**

1. Pasang HP di tripod di belakang atau samping meja, buka web-nya.
2. Tap 4 sudut meja untuk kalibrasi.
3. Tekan Record, main, lihat overlay berjalan.
4. Selesai, buka rekap sesi dan putar ulang rekamannya.

## Ruang lingkup

MVP fokus pada overlay live yang stabil. Tracking bola dan klasifikasi pukulan masuk fase berikutnya karena paling berat dan paling tidak pasti hasilnya.

| Fase | Isi | Status |
| --- | --- | --- |
| MVP (Fase 1 dan 2) | Kamera live, rekam, kalibrasi meja, tracking P1 dan P2, panel overlay, peta meja, simpan sesi | Dikerjakan pertama |
| Fase 3 | Tracking bola ringan (warna + selisih frame + Kalman), hitungan pukulan dan panjang reli | Setelah MVP stabil |
| Fase 4 | Deteksi pantulan, heatmap, kecepatan bola perkiraan, skor otomatis | Eksperimen |
| Fase 5 | Klasifikasi pukulan (forehand/backhand, topspin, push, smash), analisis ulang rekaman di backend Python | Opsional |
| Di luar scope | Akun pengguna, multi-pemain online, turnamen, wasit otomatis | Tidak dikerjakan |

## Fitur dan user stories

| ID | User story | Acceptance criteria | Fase |
| --- | --- | --- | --- |
| F1 | Sebagai pemain, saya bisa membuka kamera dari browser | Izin kamera diminta, preview tampil, kamera belakang bisa dipilih di HP | 1 |
| F2 | Saya bisa merekam sesi | Tombol Record/Stop, hasil disimpan sebagai video di perangkat, durasi tampil | 1 |
| F3 | Saya bisa mengkalibrasi meja | Tap 4 sudut, garis meja digambar, bisa diulang jika meleset | 1 |
| F4 | Saya melihat P1 dan P2 di video | Dua label mengikuti pemain, tetap konsisten selama reli, minimal 20 fps di HP | 2 |
| F5 | Saya melihat panel gaya reel | Panel pojok: jumlah pukulan, panjang reli, waktu sesi; peta meja top-down dengan posisi pemain | 2 |
| F6 | Saya bisa melihat riwayat sesi | Daftar sesi dengan tanggal dan durasi, bisa diputar ulang dan dihapus | 2 |
| F7 | Saya melihat bola terlacak | Jejak bola 1 detik terakhir, hitungan pukulan dari perubahan arah bola | 3 |
| F8 | Saya melihat tempat bola mendarat | Titik pantulan di peta meja, heatmap per sesi | 4 |
| F9 | Saya melihat kecepatan bola | Nilai perkiraan dengan label "est." | 4 |
| F10 | Saya melihat jenis pukulan | Label forehand/backhand dulu, lalu jenis lain | 5 |

## Alur pemrosesan per frame

Setiap frame kamera melewati urutan yang sama, dan seluruhnya harus selesai dalam sekitar 40 ms agar overlay terasa live di 25 fps.

1. Ambil frame dari elemen video (`requestVideoFrameCallback`).
2. Jalankan model pose untuk menemukan dua pemain.
3. Ubah koordinat pemain ke bidang meja memakai hasil kalibrasi 4 sudut (homography).
4. Perbarui statistik: posisi, jumlah pukulan, panjang reli.
5. Gambar overlay di canvas yang menumpuk di atas video.
6. Kalau sedang merekam, simpan statistik per timestamp bersama video.

## Arsitektur dan tech stack

MVP berjalan sepenuhnya di browser. Backend Python hanya ditambah di Fase 5 untuk analisis ulang rekaman dengan model yang terlalu berat bagi HP.

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Frontend | Vite + React + TypeScript | Cepat, mudah dibantu agent, tipe membantu mencegah bug |
| Tampilan | Tailwind CSS | Overlay dan panel cepat dibuat |
| Kamera dan rekam | `getUserMedia` + `MediaRecorder` | API bawaan browser |
| Pose | MediaPipe Tasks Vision (Pose Landmarker) | Jalan di browser, dukungan 2 pose |
| Overlay | Canvas 2D di atas elemen video | Ringan dan mudah disinkronkan |
| Matematika meja | Util homography sendiri di TypeScript | Hanya butuh 4 titik, tidak perlu OpenCV dulu |
| Pemrosesan | Web Worker | Model tidak menahan antarmuka |
| Penyimpanan | IndexedDB (Dexie) | Video dan statistik tetap di perangkat |
| Deploy | Vercel atau Firebase Hosting | HTTPS otomatis, wajib untuk akses kamera |
| Backend (opsional) | FastAPI + ONNX Runtime | Hanya untuk Fase 5 |

&#91;embedded content: arsitektur MVP · 6 komponen di browser, 1 backend opsional\]

Model pose dan bola jalan di Web Worker (kotak berwarna) supaya antarmuka tidak tersendat. Backend hanya dipakai untuk analisis ulang rekaman di Fase 5.

## Pipeline AI

Bagian AI dipecah jadi modul kecil yang bisa diuji sendiri. Model berat hanya masuk setelah versi ringan terbukti kurang.

| Modul | Pendekatan awal | Alternatif jika kurang | Fase |
| --- | --- | --- | --- |
| Pose pemain | MediaPipe Pose Landmarker di browser (2 pose) | YOLO-pose lewat ONNX Runtime Web | 2 |
| Kalibrasi meja | 4 tap manual, hitung homography | Deteksi sudut meja otomatis | 1 |
| Pelacak ID pemain | Pasang P1/P2 berdasarkan sisi meja kiri/kanan | Tracker berbasis IoU atau ByteTrack | 2 |
| Tracking bola | Segmentasi warna + selisih frame + Kalman filter | TrackNet (ONNX) di backend, atau di browser jika cukup ringan | 3 |
| Deteksi pantulan | Titik balik lintasan vertikal bola dalam koordinat meja | Model klasifikasi audio + lintasan | 4 |
| Kecepatan bola | Jarak antar posisi di bidang meja dibagi waktu frame | Dikalibrasi dengan ukuran meja 274 × 152,5 cm | 4 |
| Jenis pukulan | Aturan dari pose pergelangan dan arah bola | Klasifikator kecil dilatih dari rekaman sendiri | 5 |

Semua angka bola ditampilkan sebagai perkiraan dengan label "est.". Tidak ada klaim akurasi radar.

## Kebutuhan non-fungsional

- **Performa:** overlay minimal 20 fps di HP kelas menengah, target 25 fps. Jika di bawah itu, turunkan resolusi input ke 640 px atau lewati tiap frame kedua.
- **Kamera:** utamakan 60 fps jika perangkat mendukung. Minta resolusi 1280 × 720 dulu, bukan 4K.
- **Privasi:** video dan statistik disimpan di perangkat (IndexedDB), tidak dikirim ke server.
- **Kompatibilitas:** Chrome dan Safari terbaru di Android dan iOS, serta Chrome di laptop. Web harus lewat HTTPS agar kamera bisa diakses.
- **Ketahanan:** jika izin kamera ditolak atau model gagal dimuat, tampilkan pesan yang jelas, bukan layar kosong.
- **Penyimpanan:** satu sesi 10 menit boleh sampai ratusan MB, jadi sediakan tombol hapus dan peringatan ruang penuh.

## Metrik keberhasilan

Diukur dengan rekaman uji milik sendiri, minimal 5 klip pendek (30 sampai 60 detik) dengan sudut kamera berbeda.

| Metrik | Target MVP | Cara uji |
| --- | --- | --- |
| FPS overlay di HP | ≥ 20 | Counter fps di pojok layar selama 2 menit |
| Pemain terdeteksi dua-duanya | ≥ 90% frame | Hitung manual di 3 klip |
| Label P1/P2 tertukar | ≤ 1 kali per klip | Tonton ulang klip uji |
| Error kalibrasi meja | Garis meja menempel sudut dalam ≤ 10 px | Cek visual setelah 4 tap |
| Hitungan pukulan (Fase 3) | Selisih ≤ 15% dari hitungan manual | Bandingkan dengan hitung sendiri |
| Waktu dari buka web sampai Record | ≤ 60 detik | Uji dengan stopwatch |

## Roadmap

Lima fase dengan gate di antaranya. Fase berikutnya baru dimulai setelah kriteria gate terpenuhi, tanpa tenggat tetap karena ini proyek pribadi.

&#91;embedded content: roadmap · 5 fase, 4 gate\]

## Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Bola terlalu kecil dan cepat untuk dilacak ringan | Hitungan pukulan dan pantulan tidak akurat | Pakai kamera 60 fps, bola oranye kontras dengan latar, siapkan jalur backend TrackNet |
| HP panas atau fps turun saat model jalan | Overlay patah-patah | Turunkan resolusi input, lewati frame, jalankan model di Web Worker |
| Pose tertukar antar pemain | Statistik P1/P2 salah | Tentukan ID dari sisi meja, bukan dari model |
| Sudut kamera berubah di tengah sesi | Kalibrasi meleset | Tombol kalibrasi ulang, peringatan jika kamera bergeser |
| Safari iOS membatasi MediaRecorder atau kamera | Fitur rekam gagal di iPhone | Uji di Safari sejak Fase 1, siapkan format cadangan |
| Cakupan melebar sebelum MVP selesai | Proyek mandek | Kunci MVP di Fase 1 dan 2, fitur bola hanya setelah MVP stabil |
| Kode hasil vibe coding menumpuk dan sulit diperbaiki | Bug sulit dilacak | Aturan agent di repo, satu fitur per sesi, commit kecil dan sering |

## Struktur repo dan cara kerja dengan agent

Semua aturan proyek ditulis sekali di `AGENTS.md`, lalu dipakai Claude Code dan Antigravity. Pekerjaan teknis dipecah jadi skill kecil yang dipanggil agent sesuai tugasnya.

```
tt-analytics/
  AGENTS.md                      aturan proyek (sumber utama)
  CLAUDE.md                      hanya berisi @AGENTS.md
  docs/PRD.md                    salinan PRD ini
  .claude/skills/<nama>/SKILL.md skill untuk Claude Code
  .agents/skills/<nama>/SKILL.md salinan yang sama untuk Antigravity
  src/
```

| Skill | Dipakai saat | Fase |
| --- | --- | --- |
| `tt-camera-capture` | Mengerjakan kamera, perekaman, izin, dan penyimpanan sesi | 1 |
| `tt-table-calibration` | Kalibrasi 4 sudut dan homography ke koordinat meja | 1 |
| `tt-pose-tracking` | Pose, ID P1/P2, Web Worker | 2 |
| `tt-overlay-hud` | Panel gaya reel, peta meja, canvas overlay | 2 |
| `tt-ball-tracking` | Tracking bola, hitungan pukulan, pantulan | 3 dan 4 |
| `tt-perf-testing` | Mengukur fps dan menguji dengan klip uji | Semua |

**Cara kerja yang disarankan**

1. Satu fitur per sesi agent, dan sebut ID fitur dari tabel F1 sampai F10.
2. Minta agent membaca `AGENTS.md` dan skill yang relevan sebelum menulis kode.
3. Jalankan di perangkat nyata setelah tiap fitur, jangan menumpuk beberapa fitur.
4. Commit kecil dan sering, supaya perubahan buruk mudah dibatalkan.
5. Lokasi folder skill Antigravity bisa berbeda antar versi, jadi cek di pengaturan Antigravity bila skill tidak terbaca.
