---
name: tt-perf-testing
description: Gunakan setiap kali selesai mengerjakan fitur di proyek TableTennis Live Analytics, atau saat mengukur fps, waktu inferensi, menulis unit test Vitest, atau menguji dengan klip uji pingpong.
---

# Performa dan pengujian

## Ukur, jangan menebak
1. Tambahkan counter fps kecil (bisa disembunyikan) di pojok layar. Hitung fps overlay dan fps inferensi terpisah.
2. Ukur tiap tahap dengan `performance.now()`: ambil frame, pose, bola, statistik, gambar. Tampilkan rata-rata dan p95 selama 2 menit.
3. Budget per frame sekitar 40 ms. Catat tahap mana yang paling berat sebelum mengoptimasi.

## Optimasi, urut dari yang paling murah
1. Turunkan resolusi input ke model.
2. Lewati frame selang-seling, tanpa menumpuk antrean.
3. Pindahkan kerja ke Web Worker.
4. Gunakan delegate GPU, dan fallback ke CPU.
5. Baru sesudah itu pertimbangkan model yang lebih kecil.

## Unit test (Vitest)
- Semua fungsi di `src/lib/` (homography, Kalman, statistik pukulan dan reli) punya test.
- Test memakai data sintetis yang kecil, bukan video.
- `npm run typecheck` dan `npm run test` harus hijau sebelum fitur dianggap selesai.

## Klip uji
- Simpan 5 klip pendek (30 sampai 60 detik) di `test-clips/`, folder ini di `.gitignore`.
- Variasikan sudut kamera, cahaya, dan warna bola.
- Tulis hitungan manual (jumlah pukulan, panjang reli) di `test-clips/README.md` sebagai pembanding.

## Laporan singkat di akhir tiap fitur
Tulis: perangkat yang dipakai, fps rata-rata, waktu inferensi p95, hasil dibanding hitungan manual, dan masalah yang masih ada.

## Metrik target (dari PRD)
| Metrik | Target MVP |
| --- | --- |
| FPS overlay di HP | >= 20 |
| Pemain terdeteksi dua-duanya | >= 90% frame |
| Label P1/P2 tertukar | <= 1 kali per klip |
| Error kalibrasi | <= 10 px |
| Hitungan pukulan (Fase 3) | selisih <= 15% |
