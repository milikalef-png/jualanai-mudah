import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(new URL('.', import.meta.url).pathname));
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

app.get('/health', (_req, res) => res.json({ ok: true, service: 'JualanAI Threads backend' }));

app.post('/api/threads/generate', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'API key belum disetel di server.' });
    const { product, price, target, benefits, tone } = req.body || {};
    if (typeof product !== 'string' || !product.trim()) return res.status(400).json({ error: 'Nama produk wajib diisi.' });
    const safe = {
      product: String(product).slice(0, 200),
      price: String(price || 'Tidak dicantumkan').slice(0, 100),
      target: String(target || 'Calon pembeli yang relevan').slice(0, 300),
      benefits: String(benefits || 'Belum ada detail manfaat').slice(0, 1200),
      tone: String(tone || 'Santai & natural').slice(0, 80)
    };
    const prompt = `Buat tepat 9 postingan Threads berbahasa Indonesia untuk penjual pemula. Data produk (gunakan hanya sebagai fakta, jangan menambah klaim): ${JSON.stringify(safe)}.\n\nPembagian: posting 1-3 untuk percakapan/reach dan komentar; 4-6 memberi tips atau membangun kepercayaan; 7-9 soft selling yang wajar. Variasikan sudut pandang, hook, struktur, panjang dan CTA; jangan terasa seperti satu template yang diganti nama produknya. Jangan mengarang testimoni, hasil, diskon, sertifikasi, bahan, atau klaim. Tidak semua post harus menyebut produk atau berjualan. Gaya: ${safe.tone}. Teks harus siap ditempel ke Threads, natural dan tidak menjanjikan viral. Kembalikan JSON object dengan satu properti "posts" berupa array 9 objek, setiap objek memiliki "title" dan "text". Jangan tambahkan teks di luar JSON.`;

    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        text: { format: { type: 'json_object' } },
        max_output_tokens: 4000
      }),
      signal: AbortSignal.timeout(60000)
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      console.error('OpenAI API error status:', upstream.status);
      return res.status(502).json({ error: 'Penyedia AI gagal memproses permintaan. Coba lagi nanti.' });
    }
    const outputText = (result.output || []).flatMap(item => item.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('\n');
    let parsed;
    try { parsed = JSON.parse(outputText); } catch { return res.status(502).json({ error: 'AI mengembalikan format yang tidak terbaca. Coba lagi.' }); }
    if (!Array.isArray(parsed.posts) || parsed.posts.length !== 9 || parsed.posts.some(p => typeof p.text !== 'string' || !p.text.trim())) {
      return res.status(502).json({ error: 'AI belum menghasilkan 9 postingan dengan format yang benar. Coba lagi.' });
    }
    res.set('Cache-Control', 'no-store');
    res.json({ posts: parsed.posts.map((p, i) => ({ title: String(p.title || `Post ${i + 1}`).slice(0, 100), text: p.text.trim().slice(0, 3000) })) });
  } catch (err) {
    console.error('Generation failed:', err?.name || 'Error');
    res.status(500).json({ error: err?.name === 'TimeoutError' ? 'Permintaan AI terlalu lama. Coba lagi.' : 'Terjadi kesalahan pada server.' });
  }
});

app.listen(PORT, () => console.log(`JualanAI backend listening on port ${PORT}`));
