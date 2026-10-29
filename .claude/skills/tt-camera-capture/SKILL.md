---
name: tt-camera-capture
description: Gunakan saat mengerjakan akses kamera di browser, tombol Record/Stop, MediaRecorder, izin kamera, wake lock, atau penyimpanan sesi ke IndexedDB di proyek TableTennis Live Analytics (fitur F1, F2, F6).
---

# Kamera, rekam, dan penyimpanan sesi

## Tujuan
Pengguna membuka web di HP atau laptop, melihat preview kamera, menekan Record, lalu sesinya tersimpan di perangkat.

## Langkah
1. Minta kamera lewat `navigator.mediaDevices.getUserMedia` dengan constraint:
   `{ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }, audio: false }`.
   Jangan minta 4K. Setelah stream jalan, baca `track.getSettings()` dan simpan fps dan resolusi aktual.
2. Pasang stream ke `<video>` dengan atribut `playsInline`, `muted`, `autoPlay`. Tanpa `playsInline` Safari iOS membuka layar penuh.
3. Tangani error dengan pesan yang jelas: `NotAllowedError` (izin ditolak), `NotFoundError` (tidak ada kamera), `NotReadableError` (kamera dipakai aplikasi lain). Jangan biarkan layar kosong.
4. Perekaman: pilih `mimeType` dengan `MediaRecorder.isTypeSupported`, urutan coba `video/webm;codecs=vp9`, `video/webm`, `video/mp4`. Safari biasanya hanya mendukung mp4.
5. Simpan chunk dari `ondataavailable` (timeslice 1000 ms) ke IndexedDB lewat Dexie supaya sesi panjang tidak memenuhi RAM.
6. Simpan metadata sesi: id, tanggal, durasi, mimeType, fps aktual, hasil kalibrasi. Statistik per timestamp disimpan di tabel terpisah.
7. Aktifkan `navigator.wakeLock.request('screen')` saat merekam agar layar tidak mati. Lepas saat berhenti.
8. Saat komponen di-unmount, hentikan semua track dan lepaskan wake lock.

## Catatan
- Kamera hanya bisa diakses lewat HTTPS atau `localhost`. Untuk uji di HP, pakai deploy preview atau tunnel HTTPS.
- Sediakan tombol ganti kamera (depan/belakang) dan tombol hapus sesi.
- Beri peringatan jika ruang penyimpanan hampir penuh (`navigator.storage.estimate`).

## Cek sebelum selesai
- [ ] Jalan di Chrome Android dan Safari iOS (atau catat jika belum diuji)
- [ ] Video hasil rekam bisa diputar ulang dari riwayat sesi
- [ ] Izin ditolak menampilkan pesan, bukan layar kosong
