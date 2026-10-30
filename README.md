# 🏓 TableTennis Live Analytics

Web application modern yang memanfaatkan kamera smartphone atau laptop saat bermain tenis meja (pingpong) untuk mendeteksi pose pemain, melacak pergerakan bola, menghitung rally, dan mencatat skor pertandingan secara real-time langsung di browser (**100% On-Device / Edge Computing**).

🌐 **Live Demo:** [https://tenis-meja.vercel.app](https://tenis-meja.vercel.app)  
📦 **Repository:** [https://github.com/Radikdwiyoga/tabletennis-live-analytics](https://github.com/Radikdwiyoga/tabletennis-live-analytics)

---

## ✨ Fitur Utama

- 📹 **Camera Feed & Multi-Lens Switcher:** Dukungan `getUserMedia` dengan kemampuan berganti kamera depan / belakang (environment) dan pemilihan lensa wide-angle.
- 🔴 **Perekaman Sesi Offline (F2):** Perekaman video sesi berbasis WebM menggunakan `MediaRecorder` dengan penyimpanan terfragmentasi (*chunked streaming*) ke browser **IndexedDB (Dexie)** dan perlindungan Screen WakeLock.
- 📐 **Kalibrasi Meja 4-Titik (F3):** Transformasi perspektif (*Homography*) menggunakan algoritma DLT (Direct Linear Transformation) murni dengan eliminasi Gauss-Jordan $8 \times 8$ untuk memetakan koordinat kamera ke ukuran meja standar ITTF ($274 \times 152.5\text{ cm}$).
- 🧍 **Pelacakan Pose Pemain P1–P4 (F4):** Deteksi pose MediaPipe Tasks Vision (`PoseLandmarker`) yang berjalan di Web Worker / GPU (dengan fallback main thread otomatis). Dilengkapi smoothing filter *1 Euro*, visualisasi kerangka tulang (*skeleton limbs*), serta identifikasi gesture pukulan (**⚡ Forehand / ⚡ Backhand / Siap**).
- 🎾 **Pelacakan Bola & Estimasi Pantulan (F7–F9):** Deteksi bola berbasis perbedaan gerakan inter-frame, segmentasi warna HSV adaptif (oranye/putih), *Spatial Grid Clustering*, dan 2D Kalman Filter untuk lintasan pantulan meja.
- 🔢 **Papan Skor Live ITTF & Umpire Suara (TTS):** 
  - Mendukung format pertandingan **11 Poin** (modern) dan **21 Poin** (klasik).
  - Rotasi servis otomatis (setiap 2 poin untuk format 11pt, setiap 5 poin untuk format 21pt, dan bergantian tiap 1 poin saat Deuce).
  - Wasit suara otomatis berbahasa Indonesia via Web Speech API (`"Poin Tim A, sembilan - delapan. Servis Tim B"`).
- 📱 **Mobile-First Responsive Layout:** Tata letak ultra-bersih untuk smartphone tanpa menutupi area meja dan video permainan. Kontrol skor dan mode dapat dioperasikan mudah dengan jempol di bawah video.

---

## 🛠️ Tech Stack

- **Framework:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Computer Vision & AI:**
  - `@mediapipe/tasks-vision` (Pose Landmarker running locally via WASM/WebGL)
  - Color & Motion Segmenter in Web Worker
  - Constant Velocity Kalman Filter 2D
- **Local Storage:** [Dexie.js](https://dexie.com/) (IndexedDB wrapper)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Testing:** [Vitest](https://vitest.dev/) (Unit testing untuk matematika homography, kalman filter, skor, dsb.)
- **Deployment:** [Vercel](https://vercel.com/)

---

## 🚀 Menjalankan Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
- Koneksi kamera (webcam laptop atau kamera HP via HTTPS).

### Langkah Instalasi

1. **Clone repository:**
   ```bash
   git clone https://github.com/Radikdwiyoga/tabletennis-live-analytics.git
   cd tabletennis-live-analytics
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan development server:**
   ```bash
   npm run dev
   ```
   > 💡 **Tips Pengujian di Smartphone:** Buka URL lokal via HTTPS atau gunakan tunnel preview (misal: Ngrok, Cloudflare Tunnel, atau deploy preview Vercel) karena API `getUserMedia` pada browser mobile mewajibkan koneksi aman (HTTPS).

---

## 🧪 Perintah Pengujian & Build

```bash
# Memeriksa tipe TypeScript tanpa kompilasi
npm run typecheck

# Menjalankan rangkaian unit test (51 tests)
npm run test

# Membangun aplikasi untuk produksi
npm run build

# Menjalankan preview dari build produksi
npm run preview
```

---

## 🔒 Privasi & Keamanan Data

- **100% Diproses di Perangkat:** Seluruh komputasi visual (video kamera, pose pemain, dan pelacakan bola) dijalankan di browser pengguna secara lokal melalui Web Worker dan WebAssembly.
- **Tanpa Pengiriman Data Video:** Video rekaman dan statistik hanya disimpan di IndexedDB perangkat Anda dan tidak pernah diunggah ke server cloud manapun.

---

## 📄 Lisensi

Proyek pribadi dilisensikan di bawah [MIT License](LICENSE).
