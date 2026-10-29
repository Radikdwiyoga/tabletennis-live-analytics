---
name: tt-table-calibration
description: Gunakan saat mengerjakan kalibrasi meja pingpong dengan 4 tap, perhitungan homography, atau konversi koordinat gambar ke koordinat meja di proyek TableTennis Live Analytics (fitur F3).
---

# Kalibrasi meja dan homography

## Tujuan
Pengguna mengetuk 4 sudut meja di video. Dari situ kita punya pemetaan antara piksel frame dan koordinat meja (cm), dipakai untuk peta meja, pantulan, dan kecepatan.

## Aturan koordinat
- Meja 274 x 152,5 cm. Origin di sudut kiri-dekat, x sepanjang meja, y menjauh dari kamera.
- Urutan tap: kiri-dekat, kanan-dekat, kanan-jauh, kiri-jauh. Tampilkan petunjuk urutan di layar.
- Titik tujuan: (0,0), (274,0), (274,152.5), (0,152.5).

## Implementasi (`src/lib/homography.ts`, fungsi murni)
1. Hitung matriks homography 3x3 dari 4 pasangan titik dengan DLT: susun sistem linear 8x8 dan selesaikan dengan eliminasi Gauss (pivot sebagian). Tidak perlu OpenCV.
2. Ekspor `computeHomography(src, dst)`, `applyHomography(H, p)`, `invert(H)`, `toTable(p)`, `toImage(p)`.
3. Validasi input sebelum menghitung: keempat titik membentuk segi empat cembung dan luasnya lebih dari ambang minimum. Kalau tidak, minta pengguna mengulang.
4. Gambar garis meja di overlay dari hasil kalibrasi agar pengguna bisa menilai ketepatan, dengan tombol Ulangi.
5. Simpan hasil kalibrasi di metadata sesi. Sediakan tombol kalibrasi ulang kapan saja.

## Batasan penting
Homography hanya benar untuk titik yang berada di bidang meja. Kaki pemain berada di lantai, bukan di meja, jadi posisi pemain di peta meja hanya perkiraan. Beri label "perkiraan" di UI, dan gunakan terutama posisi sisi kiri/kanan.

## Unit test wajib (Vitest)
- Empat sudut gambar memetakan ke empat sudut meja dengan error < 1e-6.
- Round trip `toImage(toTable(p))` kembali ke p dengan error < 1e-6.
- Input titik yang kolinear atau berurutan salah ditolak.
