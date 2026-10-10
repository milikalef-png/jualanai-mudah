
import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json({ limit: '100kb' }));

app.use(express.static(new URL('./public', import.meta.url).pathname));

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

app.get('/', (_req, res) => {
  res.sendFile(new URL('./public/index.html', import.meta.url).pathname);
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'JualanAI Threads backend' });
});

app.post('/api/threads/generate', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'API key belum disetel di server.'
      });
    }

    const { product, price, target, benefits, tone } = req.body || {};

    if (typeof product !== 'string' || !product.trim()) {
      return res.status(400).json({
        error: 'Nama produk wajib diisi.'
      });
    }

    const safe = {
      product: String(product).slice(0, 200),
      price: String(price || 'Tidak dicantumkan').slice(0, 100),
      target: String(target || 'Calon pembeli yang relevan').slice(0, 300),
      benefits: String(benefits || 'Belum ada detail manfaat').slice(0, 1200),
      tone: String(tone || 'Santai & natural').slice(0, 80)
    };

    const toneInstructions = {
      'Santai & natural': `
Gunakan bahasa percakapan yang akrab seperti teman bercerita.
Pakai contoh kehidupan sehari-hari dan kalimat yang mengalir.
Hindari bahasa iklan, bahasa kaku, dan promosi berlebihan.
Buat pembaca merasa sedang diajak ngobrol, bukan ditawari produk.
Emoji boleh digunakan secara wajar.
`,
      'Elegan': `
Gunakan bahasa yang halus, berkelas, tenang, dan terpilih.
Tonjolkan nilai, detail, pengalaman, estetika, atau makna produk
sesuai fakta yang tersedia. Gunakan kalimat rapi dan tidak berlebihan.
Hindari slang, emoji berlebihan, tanda seru berulang, dan kesan murahan.
`,
      'Profesional': `
Gunakan bahasa jelas, kredibel, informatif, dan terstruktur.
Sajikan pertimbangan pembeli, tips praktis, manfaat yang relevan,
serta informasi produk berdasarkan data yang tersedia.
Hindari basa-basi berlebihan, klaim tanpa bukti, dan bahasa terlalu santai.
`,
      'Lucu & ringan': `
Gunakan humor ringan, situasi sehari-hari yang relatable,
kejutan kecil, atau punchline yang relevan dengan produk.
Buat tulisan menghibur dan mudah dibaca, bukan sekadar menambahkan emoji.
Jangan memaksakan lelucon pada setiap kalimat atau merendahkan orang.
`
    };

    const toneInstruction =
      toneInstructions[safe.tone] ||
      toneInstructions['Santai & natural'];

    const prompt = `
Buat tepat 9 postingan Threads berbahasa Indonesia.

DATA PRODUK:
${JSON.stringify(safe)}

GAYA PILIHAN:
${safe.tone}

PEDOMAN KHUSUS GAYA:
${toneInstruction}

TUJUAN 9 POSTINGAN:
- Post 1: pembuka yang menarik dan relevan.
- Post 2: cerita, kebiasaan, atau situasi sehari-hari.
- Post 3: pertanyaan yang mudah dijawab pembaca.
- Post 4: tips praktis yang benar-benar berguna.
- Post 5: edukasi atau hal yang perlu dipertimbangkan pembeli.
- Post 6: sudut pandang atau pengalaman umum yang relevan,
  tanpa mengarang pengalaman pribadi penjual.
- Post 7: memperkenalkan produk secara halus.
- Post 8: menjelaskan manfaat atau menjawab keraguan pembeli
  hanya berdasarkan informasi yang tersedia.
- Post 9: ajakan bertindak yang wajar, tidak memaksa.

ATURAN PENTING:
1. Kesembilan postingan harus memiliki pembuka, sudut pandang,
   dan struktur kalimat yang bervariasi.
2. Jangan menggunakan satu pola tulisan berulang dengan
   hanya mengganti kata atau nama produk.
3. Terapkan gaya pilihan secara konsisten pada semua postingan.
4. Tidak semua postingan harus menyebut produk atau berjualan.
5. Sesuaikan bahasa dengan target pembeli.
6. Jangan mengarang testimoni, diskon, sertifikasi, bahan,
   stok, hasil penggunaan, atau klaim yang tidak diberikan.
7. Jangan menjanjikan postingan akan viral.
8. Setiap teks harus siap disalin dan dipublikasikan di Threads.
9. Hindari kalimat penutup berupa pertanyaan pada semua postingan.
10. Setiap postingan harus tetap masuk akal meskipun dibaca sendiri.

KELUARAN:
Kembalikan JSON object dengan satu properti "posts",
berupa array tepat 9 objek. Setiap objek harus memiliki
"title" dan "text". Jangan menambahkan teks di luar JSON.
`;

    const upstream = await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          input: prompt,
          text: { format: { type: 'json_object' } },
          max_output_tokens: 4000
        }),
        signal: AbortSignal.timeout(60000)
      }
    );

    const result = await upstream.json();

    if (!upstream.ok) {
      console.error('OpenAI API error status:', upstream.status);
      return res.status(502).json({
        error: 'Penyedia AI gagal memproses permintaan. Coba lagi nanti.'
      });
    }

    const outputText = (result.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text')
      .map(item => item.text)
      .join('\n');

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch {
      return res.status(502).json({
        error: 'AI mengembalikan format yang tidak terbaca. Coba lagi.'
      });
    }

    if (
      !Array.isArray(parsed.posts) ||
      parsed.posts.length !== 9 ||
      parsed.posts.some(
        post => typeof post.text !== 'string' || !post.text.trim()
      )
    ) {
      return res.status(502).json({
        error: 'AI belum menghasilkan 9 postingan dengan format benar. Coba lagi.'
      });
    }

    res.set('Cache-Control', 'no-store');

    res.json({
      posts: parsed.posts.map((post, index) => ({
        title: String(post.title || `Post ${index + 1}`).slice(0, 100),
        text: post.text.trim().slice(0, 3000)
      }))
    });
  } catch (err) {
    console.error('Generation failed:', err?.name || 'Error');

    res.status(500).json({
      error: err?.name === 'TimeoutError'
        ? 'Permintaan AI terlalu lama. Coba lagi.'
        : 'Terjadi kesalahan pada server.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`JualanAI backend listening on port ${PORT}`);
});
