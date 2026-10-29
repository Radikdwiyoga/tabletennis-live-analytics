---
name: tt-pose-tracking
description: Gunakan saat mengerjakan deteksi pose pemain dengan MediaPipe, label P1/P2, Web Worker untuk inferensi, atau optimasi fps pemrosesan pose di proyek TableTennis Live Analytics (fitur F4).
---

# Pose dan tracking pemain P1/P2

## Tujuan
Dua pemain terdeteksi dan diberi label P1 dan P2 yang stabil sepanjang sesi, minimal 20 fps di HP.

## Langkah
1. Pakai `@mediapipe/tasks-vision` `PoseLandmarker`: `runningMode: 'VIDEO'`, `numPoses: 2`, model `lite`. Mulai dengan delegate GPU, fallback ke CPU kalau gagal.
2. Jalankan inferensi di Web Worker. Kirim frame sebagai `ImageBitmap` (transferable) dari main thread. Verifikasi di dokumentasi MediaPipe terbaru bagaimana memuat modul di worker. Kalau integrasi worker terblokir, fallback ke main thread dengan `requestVideoFrameCallback` dan catat itu sebagai utang teknis.
3. Turunkan resolusi input ke lebar sekitar 640 px sebelum inferensi. Kalau waktu inferensi rata-rata > 40 ms, lewati frame selang-seling, jangan menumpuk antrean frame.
4. Penentuan ID: P1 = pemain di sisi kiri garis tengah meja, P2 = sisi kanan, berdasarkan titik tengah pinggul. Jangan mengandalkan urutan keluaran model. Pakai histeresis agar label tidak bolak-balik saat pemain melintas garis tengah.
5. Abaikan pose di luar area meja yang diperlebar (penonton). Area = poligon hasil kalibrasi diperbesar sekitar 1,5 m.
6. Kalau satu pose hilang, pertahankan posisi terakhir maksimal 15 frame, lalu tandai hilang.
7. Haluskan landmark dengan One Euro filter agar overlay tidak bergetar.
8. Keluaran per frame bertipe `PlayerFrame { id: 'P1' | 'P2'; hip: Point; wrists: [Point, Point]; confidence: number; t: number }`.

## Cek sebelum selesai
- [ ] Ukur fps dan waktu inferensi dengan skill `tt-perf-testing`
- [ ] Label tidak tertukar lebih dari 1 kali per klip uji 30 detik
- [ ] Penonton di belakang meja tidak ikut terlabel
