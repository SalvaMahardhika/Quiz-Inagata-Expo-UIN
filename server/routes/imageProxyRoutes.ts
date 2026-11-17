import { Router } from 'express';

export const imageProxyRoutes = Router();

function isAllowedGoogleImageHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower.endsWith('.googleusercontent.com') ||
    lower === 'drive.google.com' ||
    lower === 'drive.usercontent.google.com' ||
    lower === 'docs.google.com'
  );
}

imageProxyRoutes.get('/', async (req, res) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl) {
    res.status(400).send('URL gambar kosong');
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    res.status(400).send('URL tidak valid');
    return;
  }

  if (parsed.protocol !== 'https:' || !isAllowedGoogleImageHost(parsed.hostname)) {
    res.status(403).send('Host gambar tidak diizinkan');
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuizInagataBot/1.0)',
      },
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      res.status(upstream.status).send('Gagal mengambil gambar');
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      res.status(415).send('Respons bukan gambar yang valid');
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  } catch {
    res.status(502).send('Gagal menghubungi server gambar');
  }
});
