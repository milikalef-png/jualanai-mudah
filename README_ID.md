# Backend uji JualanAI Mudah — Threads

**Ini prototipe untuk pengujian, belum siap produksi.** File HTML bisa tetap dipakai dalam mode demo tanpa API. Untuk AI sungguhan, jalankan backend ini di komputer/server dan hubungkan alamat endpoint di kolom "Alamat backend" pada HTML.

## Persiapan
1. Instal Node.js versi LTS di komputer/server.
2. Salin folder ini ke server.
3. Jalankan `npm install`.
4. Salin `.env.example` menjadi `.env`, lalu isi `OPENAI_API_KEY` milik sendiri. Jangan bagikan file `.env`.
5. Jalankan `npm start`.
6. Tes `http://localhost:3000/health`; seharusnya muncul JSON `ok: true`.
7. Buka `http://localhost:3000` untuk aplikasi yang sudah disajikan oleh backend. Masukkan `http://localhost:3000/api/threads/generate` ke kolom endpoint untuk tes lokal. Karena HTML dan API berada pada origin yang sama, pengujian lokal tidak membutuhkan CORS. Untuk deployment online, gunakan HTTPS dan domain server yang sesuai.

## Catatan keamanan sebelum dipakai pelanggan
- Jangan menyimpan API key di HTML, GitHub publik, atau membagikannya ke pelanggan.
- Contoh ini belum memiliki login, autentikasi, rate limit, kuota per pengguna, proteksi abuse, atau sistem pembayaran.
- Sebelum dipublikasikan, tambahkan autentikasi, rate limiting, batas biaya, logging minimum, kebijakan privasi, dan pembatasan origin (CORS) sesuai domain aplikasi.
- Jangan gunakan server ini terbuka ke internet tanpa pengamanan tersebut; jika tidak, orang lain bisa memakai kuota API.
- Nama model dapat diubah melalui `OPENAI_MODEL` setelah memeriksa ketersediaan model dan harga terkini.
- Backend meminta keluaran JSON; respons tetap divalidasi dan aplikasi menolak hasil yang bukan tepat 9 postingan.

## Bentuk respons
`{ "posts": [{ "title": "...", "text": "..." }, ... total 9] }`
