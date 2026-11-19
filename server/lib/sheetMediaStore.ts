import crypto from 'node:crypto';

interface CachedMediaItem {
  buf: Buffer;
  contentType: string;
}

const MAX_MEDIA_ITEMS = 300;
const mediaStore = new Map<string, CachedMediaItem>();

function detectMimeType(extOrPath: string): string {
  const lower = extOrPath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

export function registerSheetMedia(buf: Buffer, extOrPath: string): string {
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20);
  const extMatch = extOrPath.toLowerCase().match(/\.(png|jpe?g|webp|gif|svg|bmp)$/);
  const id = extMatch ? `${hash}.${extMatch[1]}` : `${hash}.png`;

  if (!mediaStore.has(id)) {
    if (mediaStore.size >= MAX_MEDIA_ITEMS) {
      const oldestKey = mediaStore.keys().next().value;
      if (oldestKey) mediaStore.delete(oldestKey);
    }
    mediaStore.set(id, {
      buf,
      contentType: detectMimeType(extOrPath),
    });
  }

  return `/api/image-proxy/media/${id}`;
}

export function getSheetMedia(id: string): CachedMediaItem | undefined {
  return mediaStore.get(id);
}
