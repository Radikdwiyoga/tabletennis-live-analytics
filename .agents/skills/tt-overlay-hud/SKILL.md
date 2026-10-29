---
name: tt-overlay-hud
description: Gunakan saat membuat atau mengubah overlay gaya reel di atas video: panel statistik, label P1/P2, peta meja top-down, canvas overlay, dan sinkronisasi tampilan di proyek TableTennis Live Analytics (fitur F5, F6).
---

# Overlay dan HUD

## Tujuan
Tampilan di atas video mirip reel analitik olahraga: panel kecil di pojok, label pemain, dan peta meja. Terbaca jelas di layar HP.

## Susunan layar
- Kiri atas: panel **RALLY** (panjang reli saat ini, waktu sesi).
- Kanan atas: panel **SHOT COUNT** (jumlah pukulan). Muncul hanya setelah Fase 3.
- Kiri bawah: panel pemain (P1 dan P2, posisi atau jarak dari meja), diberi label "perkiraan".
- Kanan bawah: **peta meja** top-down dengan titik pemain dan, nanti, titik pantulan.
- Di atas video: label P1 dan P2 mengikuti pemain, dan garis meja dari kalibrasi.

## Aturan teknis
1. Dua lapisan: `<video>` di bawah, `<canvas>` overlay di atas dengan ukuran sama. Untuk panel dan teks pakai elemen DOM absolut agar tajam dan murah.
2. Gambar di canvas dalam loop `requestAnimationFrame` yang terpisah dari inferensi. Overlay membaca state terakhir dari store (mis. zustand), tidak menunggu hasil model.
3. Skala canvas dengan `devicePixelRatio`. Jangan membuat objek baru di dalam loop gambar.
4. Warna pemain konsisten: P1 hijau limau, P2 ungu. Panel gelap semi-transparan, teks kecil kapital dengan angka besar.
5. Peta meja digambar dari koordinat meja (cm) yang diskalakan ke kotak 274:152,5.
6. Semua angka dari bola diberi akhiran "est.".
7. Layout harus nyaman di layar portrait HP dan landscape laptop. Cek ukuran minimum teks 11 px.

## Cek sebelum selesai
- [ ] Overlay tidak menurunkan fps lebih dari 3 fps dibanding tanpa overlay
- [ ] Posisi overlay tetap benar setelah rotasi layar atau perubahan ukuran
- [ ] Tidak ada elemen yang tertutup notch atau bar navigasi HP
