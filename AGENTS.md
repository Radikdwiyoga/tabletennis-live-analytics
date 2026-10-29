# TableTennis Live Analytics

Web app yang membaca kamera (HP atau laptop) saat main pingpong, lalu menampilkan statistik live di atas video: posisi pemain P1/P2, jumlah pukulan, panjang reli, peta meja. Pemrosesan live jalan di browser. Proyek pribadi.

PRD lengkap ada di `docs/PRD.md`. Baca itu dan skill yang relevan sebelum menulis kode.

## Stack

- Vite + React + TypeScript (strict) + Tailwind CSS
- Kamera: `getUserMedia`, rekam: `MediaRecorder`
- Pose: MediaPipe Tasks Vision (Pose Landmarker), jalan di Web Worker
- Overlay: Canvas 2D di atas elemen video, panel HUD pakai DOM
- Penyimpanan: IndexedDB lewat Dexie
- Test: Vitest
- Backend Python (FastAPI + ONNX) hanya untuk Fase 5, jangan dibuat sebelum diminta

## Perintah

Isi bagian ini setelah proyek di-scaffold, dan perbarui kalau berubah.

- `npm run dev` jalankan lokal (kamera HP butuh HTTPS, pakai tunnel atau deploy preview)
- `npm run typecheck` untuk `tsc --noEmit`
- `npm run test` untuk Vitest
- `npm run build` untuk build produksi

## Aturan kerja

1. Satu fitur per sesi. Sebut ID fitur dari PRD (F1 sampai F10). Jangan menyentuh fitur lain.
2. Sebelum menulis kode, baca skill yang cocok di `.claude/skills/` (Claude Code) atau `.agents/skills/` (Antigravity).
3. Kalau requirement ambigu atau scope terasa melebar, tanya dulu. Jangan menebak.
4. Setelah fitur selesai: jalankan `typecheck` dan `test`, lalu tulis ringkas apa yang berubah dan cara mencobanya di HP.
5. Commit kecil dan sering, satu perubahan logis per commit.

## Aturan kode

- TypeScript strict. Tidak ada `any` tanpa komentar alasan.
- Pemrosesan per frame (pose, bola) jalan di Web Worker. Main thread hanya menggambar dan mengurus UI.
- Budget total per frame sekitar 40 ms (target 25 fps). Ukur dengan `tt-perf-testing`, jangan menebak.
- Dependensi berat (OpenCV.js, TensorFlow.js penuh) tidak boleh ditambah tanpa persetujuan.
- Komponen kecil, satu tanggung jawab. Logika matematika (homography, Kalman, statistik) berupa fungsi murni di `src/lib/` dan wajib punya unit test.

## Konvensi koordinat

- Koordinat gambar: piksel frame video, origin kiri atas, y ke bawah.
- Koordinat meja: sentimeter, ukuran meja 274 x 152,5. Origin di sudut kiri-dekat (dekat kamera), x sepanjang meja 0 sampai 274, y 0 sampai 152,5 ke arah jauh dari kamera.
- Urutan tap kalibrasi: kiri-dekat, kanan-dekat, kanan-jauh, kiri-jauh.

## Batasan produk

- Video dan statistik tidak pernah dikirim ke server. Semua tersimpan di perangkat.
- Semua angka yang berasal dari bola (kecepatan, pantulan) diberi label "est." dan tidak diklaim akurat.
- Posisi pemain di peta meja hanya perkiraan, karena kaki pemain tidak berada di bidang meja.
- Jangan commit file video. Klip uji disimpan lokal di `test-clips/` (sudah di `.gitignore`).

## Struktur folder

```
src/
  app/            halaman dan routing
  components/     komponen UI dan HUD
  lib/            fungsi murni: homography, kalman, stats
  workers/        pose dan bola
  storage/        Dexie, skema sesi
docs/PRD.md
test-clips/       lokal saja, tidak di-commit
```
