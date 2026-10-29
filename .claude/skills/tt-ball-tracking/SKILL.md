---
name: tt-ball-tracking
description: Gunakan hanya untuk Fase 3 dan 4 proyek TableTennis Live Analytics, saat mengerjakan tracking bola pingpong, hitungan pukulan, panjang reli, deteksi pantulan, heatmap, atau kecepatan bola perkiraan (fitur F7 sampai F9).
---

# Tracking bola, pukulan, dan pantulan

Jangan mulai skill ini sebelum Gate 2 lolos (pose stabil, minimal 20 fps). Bola kecil dan cepat, jadi hasil awal akan kasar. Itu normal.

## Pendekatan ringan di browser
1. Kerjakan di Web Worker pada gambar kecil (sekitar 320 x 180, grayscale atau HSV) dan hanya di area sekitar meja hasil kalibrasi.
2. Cari kandidat bola dengan menggabungkan dua petunjuk: selisih antar frame (gerakan) dan mask warna bola (oranye atau putih, parameter bisa diatur dari UI). Saring blob berdasarkan ukuran dan bentuk.
3. Kalman filter kecepatan konstan (`x, y, vx, vy`) untuk menghaluskan dan menjembatani frame yang gagal terdeteksi. Pakai gating: kandidat yang terlalu jauh dari prediksi diabaikan.
4. Simpan jejak 1 detik terakhir untuk digambar di overlay.

## Turunan statistik (fungsi murni di `src/lib/`)
- **Pukulan**: terjadi saat arah horizontal bola (`vx`) berbalik di dekat salah satu sisi meja. Satu pukulan = satu pembalikan, dengan jeda minimum antar pukulan untuk menghindari hitung ganda.
- **Reli**: berakhir jika bola hilang lebih dari jeda tertentu atau jatuh di luar meja.
- **Pantulan**: di koordinat gambar, y ke bawah, jadi pantulan = titik di mana `vy` berubah dari positif (turun) ke negatif (naik). Petakan titiknya ke koordinat meja dengan homography dan validasi bahwa titik itu berada di dalam meja.
- **Kecepatan est.**: jarak antar dua posisi di bidang meja dibagi selisih waktu. Tampilkan sebagai perkiraan dengan batas atas masuk akal, dan tandai "est.".

## Batasan
- Jangan mengklaim akurasi. Ukur selisih terhadap hitungan manual di klip uji dan laporkan angkanya.
- Kalau pendekatan ringan terlalu sering meleset, jangan tambah dependensi berat di browser. Usulkan jalur backend (TrackNet via ONNX) dan tunggu persetujuan.
- Fitur ini tidak boleh menurunkan fps di bawah 20. Pakai `tt-perf-testing` untuk mengukur.

## Cek sebelum selesai
- [ ] Selisih hitungan pukulan terhadap hitungan manual tercatat, targetnya <= 15%
- [ ] Titik pantulan di peta meja masuk akal secara visual di 3 klip
- [ ] Parameter warna bisa disesuaikan tanpa mengubah kode
