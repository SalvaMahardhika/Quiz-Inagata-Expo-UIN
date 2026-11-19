import path from 'node:path';
import * as XLSX from 'xlsx';
import { RawQuestion, TopicPackage } from '../../src/types/quiz.ts';
import { registerSheetMedia } from './sheetMediaStore.ts';

export const IGNORED_SHEET_TABS = new Set([
  'contoh',
  'contoh (hapus)',
  'contoh (hapus sheet ini)',
  'panduan',
  'petunjuk',
  'guide',
  'example',
  'template',
  'hasil',
  'results',
  'rekap',
  'peserta',
  'log',
  'leaderboard',
  'respon',
  'response',
  'responses',
]);

export const TOPIC_ACCENTS = [
  'from-red-600 to-rose-700',
  'from-amber-600 to-orange-700',
  'from-emerald-600 to-teal-700',
  'from-sky-600 to-indigo-700',
  'from-purple-600 to-fuchsia-700',
  'from-cyan-600 to-blue-700',
];

export const TOPIC_ICONS = ['📚', '🏛️', '🎭', '🧭', '🎖️', '🌏'];

export interface DiscoveredSheetTab {
  name: string;
  gid: string;
}

export interface SpreadsheetTarget {
  id: string;
  isPublished: boolean;
}

export function parseSpreadsheetTarget(urlOrId: string): SpreadsheetTarget | null {
  const trimmed = (urlOrId || '').trim();
  if (!trimmed) return null;

  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    return { id: pubMatch[1], isPublished: true };
  }

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1] && match[1] !== 'e') {
    return { id: match[1], isPublished: false };
  }

  if (/^2PACX-[a-zA-Z0-9-_]+$/.test(trimmed)) {
    return { id: trimmed, isPublished: true };
  }
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return { id: trimmed, isPublished: false };
  }
  return null;
}

export function extractSpreadsheetId(urlOrId: string): string {
  return parseSpreadsheetTarget(urlOrId)?.id || '';
}

export function normalizeAppsScriptUrl(urlOrDeploymentId: string): string {
  const trimmed = (urlOrDeploymentId || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return `https://script.google.com/macros/s/${trimmed}/exec`;
  }
  return trimmed;
}

export function extractAppsScriptDeploymentId(urlOrDeploymentId: string): string {
  const trimmed = (urlOrDeploymentId || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/macros\/s\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeJsString(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    return raw;
  }
}

function shouldProxyGoogleImage(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      (u.hostname.endsWith('.googleusercontent.com') ||
        u.hostname === 'drive.google.com' ||
        u.hostname === 'drive.usercontent.google.com')
    );
  } catch {
    return false;
  }
}

export function normalizeSpreadsheetImageUrl(raw: string): string {
  let clean = decodeHtmlEntities(String(raw || '').trim());
  if (!clean) return '';

  // Ekstrak URL dari rumus =IMAGE("https://...") atau IMAGE("https://...")
  const formulaMatch = clean.match(/^=?IMAGE\(\s*["']([^"']+)["']/i);
  if (formulaMatch && formulaMatch[1]) {
    clean = formulaMatch[1].trim();
  }

  if (clean === 'CellImage' || clean === '[object Object]') {
    return '';
  }

  // Izinkan media hasil ekstraksi spreadsheet internal & data URI
  if (clean.startsWith('/api/image-proxy/') || /^data:image\//i.test(clean)) {
    return clean;
  }

  const driveFileMatch = clean.match(
    /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i
  );
  if (driveFileMatch && driveFileMatch[1]) {
    const directUrl = `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
    return `/api/image-proxy?url=${encodeURIComponent(directUrl)}`;
  }

  const driveIdParam = clean.match(
    /https?:\/\/drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i
  );
  if (driveIdParam && driveIdParam[1]) {
    const directUrl = `https://lh3.googleusercontent.com/d/${driveIdParam[1]}`;
    return `/api/image-proxy?url=${encodeURIComponent(directUrl)}`;
  }

  // Abaikan teks catatan / path lokal (hanya terima URL http/https yang valid)
  if (!/^https?:\/\//i.test(clean)) {
    return '';
  }

  if (shouldProxyGoogleImage(clean)) {
    return `/api/image-proxy?url=${encodeURIComponent(clean)}`;
  }

  return clean;
}

export function parseCorrectIndex(
  rawVal: unknown,
  options: [string, string, string, string]
): number {
  const s = String(rawVal ?? '').trim();
  if (!s) return 0;

  const upper = s.toUpperCase();
  if (upper === 'A' || upper === 'PILIHAN A' || upper === 'OPSI A') return 0;
  if (upper === 'B' || upper === 'PILIHAN B' || upper === 'OPSI B') return 1;
  if (upper === 'C' || upper === 'PILIHAN C' || upper === 'OPSI C') return 2;
  if (upper === 'D' || upper === 'PILIHAN D' || upper === 'OPSI D') return 3;

  if (/^[0-3]$/.test(s)) return Number(s);
  if (s === '4') return 3;

  const textIdx = options.findIndex((opt) => opt.trim().toLowerCase() === s.toLowerCase());
  if (textIdx >= 0) return textIdx;

  return 0;
}

export function normalizeHeaderKey(header: string): string {
  return String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function rowObjectToQuestion(
  rowObj: Record<string, unknown>,
  topicIdx: number,
  rowIdx: number
): RawQuestion | null {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(rowObj)) {
    normalized[normalizeHeaderKey(k)] = String(v ?? '').trim();
  }

  const pertanyaan =
    normalized.pertanyaan ||
    normalized.soal ||
    normalized.question ||
    normalized.tekssoal ||
    '';
  if (!pertanyaan) return null;

  const optA = normalized.pilihana || normalized.opsia || normalized.a || normalized.jawabana || '';
  const optB = normalized.pilihanb || normalized.opsib || normalized.b || normalized.jawabanb || '';
  const optC = normalized.pilihanc || normalized.opsic || normalized.c || normalized.jawabanc || '';
  const optD = normalized.pilihand || normalized.opsid || normalized.d || normalized.jawaband || '';

  if (!optA || !optB || !optC || !optD) return null;

  const pilihan: [string, string, string, string] = [optA, optB, optC, optD];
  const rawAnswer =
    normalized.jawabanbenar ||
    normalized.kunci ||
    normalized.kuncijawaban ||
    normalized.jawaban ||
    normalized.answer ||
    '0';

  const jawabanBenar = parseCorrectIndex(rawAnswer, pilihan);
  const kode =
    normalized.kode ||
    normalized.code ||
    normalized.id ||
    `T${topicIdx}-${String(rowIdx + 1).padStart(2, '0')}`;
  const rawGambar = normalized.gambar || normalized.image || normalized.urlgambar || '';
  const gambar = normalizeSpreadsheetImageUrl(rawGambar);

  return {
    kode,
    pertanyaan,
    gambar,
    pilihan,
    jawabanBenar,
  };
}

export function parseSheetNameToTitle(
  sheetName: string,
  topicId: number
): { nama: string; judul: string } {
  const clean = sheetName.trim();
  const match = clean.match(/^(Topik\s*\d+)\s*[-:|–]\s*(.+)$/i);
  if (match) {
    return {
      nama: match[1].trim(),
      judul: match[2].trim(),
    };
  }
  return {
    nama: `Topik ${topicId}`,
    judul: clean,
  };
}

export function parseGvizJson(
  text: string
): { headers: string[]; rows: Record<string, string>[] } | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!parsed || !parsed.table || !Array.isArray(parsed.table.rows)) return null;

  const cols = Array.isArray(parsed.table.cols) ? parsed.table.cols : [];
  let headers: string[] = cols.map((c: any) => String(c?.label || '').trim());
  const rawRows: any[] = parsed.table.rows;

  let startRowIndex = 0;
  const hasColLabels = headers.some((h) => h.length > 0);
  if (!hasColLabels && rawRows.length > 0 && Array.isArray(rawRows[0].c)) {
    headers = rawRows[0].c.map((cell: any) => String(cell?.v ?? cell?.f ?? '').trim());
    startRowIndex = 1;
  }

  const rows: Record<string, string>[] = [];
  for (let r = startRowIndex; r < rawRows.length; r++) {
    const cells = rawRows[r]?.c;
    if (!Array.isArray(cells)) continue;
    const obj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const cell = cells[idx];
      const val = cell ? String(cell.f ?? cell.v ?? '').trim() : '';
      if (val) hasValue = true;
      obj[h] = val;
    });
    if (hasValue) rows.push(obj);
  }

  return { headers, rows };
}

/**
 * Menemukan seluruh tab sheet beserta gid secara otomatis dari Google Sheets
 * (mendukung /htmlview maupun /pubhtml serta urutan properti bebas).
 */
export async function discoverGoogleSheetTabs(sheetId: string): Promise<DiscoveredSheetTab[]> {
  const discovered: DiscoveredSheetTab[] = [];
  const seenNames = new Set<string>();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();

      // 1. Parse blok items.push({ ... }) tidak bergantung urutan key name/gid
      const itemBlockRegex = /items\.push\(\s*\{([\s\S]*?)\}\s*\)/g;
      let blockMatch: RegExpExecArray | null;
      while ((blockMatch = itemBlockRegex.exec(html)) !== null) {
        const block = blockMatch[1];
        const nameMatch = block.match(/["']?name["']?\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const gidMatch = block.match(/["']?gid["']?\s*:\s*"([^"]*)"/);
        if (nameMatch && nameMatch[1]) {
          let name = nameMatch[1];
          try {
            name = JSON.parse(`"${nameMatch[1]}"`);
          } catch {
            name = decodeJsString(nameMatch[1]);
          }
          const gid = gidMatch?.[1] || '0';
          if (name && !seenNames.has(name)) {
            seenNames.add(name);
            discovered.push({ name, gid });
          }
        }
      }

      // 2. Cadangan: parse tombol tab HTML (#sheet-button-GID) bila items.push tidak muncul
      if (discovered.length === 0) {
        const btnRegex = /id=["']sheet-button-(\d+)["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
        let btnMatch: RegExpExecArray | null;
        while ((btnMatch = btnRegex.exec(html)) !== null) {
          const gid = btnMatch[1];
          const name = decodeHtmlEntities(btnMatch[2].replace(/<[^>]+>/g, '')).trim();
          if (name && !seenNames.has(name)) {
            seenNames.add(name);
            discovered.push({ name, gid });
          }
        }
      }
    }
  } catch {
    // Abaikan dan lanjut ke fallback /export?format=xlsx
  }

  return discovered;
}

export interface HtmlCellImageLookup {
  byRowIndex: Map<number, string>;
  byKey: Map<string, string>;
}

/**
 * Memindai gambar di dalam sel (Insert -> Image -> Image in cell / =IMAGE(...))
 * langsung dari HTML rendering Google Sheets untuk tab gid tertentu.
 */
export async function fetchSheetHtmlCellImages(
  sheetId: string,
  gid: string
): Promise<HtmlCellImageLookup> {
  const byRowIndex = new Map<number, string>();
  const byKey = new Map<string, string>();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview/sheet?headers=true&gid=${encodeURIComponent(
      gid
    )}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { byRowIndex, byKey };

    const html = await res.text();
    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) return { byRowIndex, byKey };

    const trMatches = tbodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    if (!trMatches || trMatches.length < 2) return { byRowIndex, byKey };

    let headerRowIdx = 0;
    let gambarColIndex = -1;
    let kodeColIndex = -1;
    let pertanyaanColIndex = -1;

    // Cari baris header (Kode / Pertanyaan / Gambar) di 3 baris awal untuk antisipasi baris kolom A/B/C
    for (let r = 0; r < Math.min(3, trMatches.length); r++) {
      const cells = trMatches[r].match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
      let foundHeaderInRow = false;
      cells.forEach((cellHtml, idx) => {
        const text = decodeHtmlEntities(cellHtml.replace(/<[^>]+>/g, '')).trim();
        const norm = normalizeHeaderKey(text);
        if (norm === 'gambar' || norm === 'image' || norm === 'urlgambar') {
          gambarColIndex = idx;
          foundHeaderInRow = true;
        } else if (norm === 'kode' || norm === 'code' || norm === 'id') {
          kodeColIndex = idx;
          foundHeaderInRow = true;
        } else if (
          norm === 'pertanyaan' ||
          norm === 'soal' ||
          norm === 'question' ||
          norm === 'tekssoal'
        ) {
          pertanyaanColIndex = idx;
          foundHeaderInRow = true;
        }
      });
      if (foundHeaderInRow) {
        headerRowIdx = r;
        break;
      }
    }

    const extractImgFromCell = (cellHtml: string): string => {
      const imgMatch = cellHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) return decodeHtmlEntities(imgMatch[1]);
      const bgMatch = cellHtml.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
      if (bgMatch && bgMatch[1]) return decodeHtmlEntities(bgMatch[1]);
      return '';
    };

    let dataRowIndex = 0;
    for (let r = headerRowIdx + 1; r < trMatches.length; r++) {
      const cells = trMatches[r].match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
      if (cells.length === 0) continue;

      const rowText = cells.map((c) => c.replace(/<[^>]+>/g, '').trim()).join('');
      const hasAnyImg = /<img\b|background-image\s*:/i.test(trMatches[r]);
      if (!rowText && !hasAnyImg) continue;

      let foundSrc = '';
      if (gambarColIndex >= 0 && cells[gambarColIndex]) {
        foundSrc = extractImgFromCell(cells[gambarColIndex]);
      }
      if (!foundSrc) {
        foundSrc = extractImgFromCell(trMatches[r]);
      }

      if (foundSrc) {
        byRowIndex.set(dataRowIndex, foundSrc);
        if (kodeColIndex >= 0 && cells[kodeColIndex]) {
          const kodeVal = decodeHtmlEntities(cells[kodeColIndex].replace(/<[^>]+>/g, '')).trim();
          if (kodeVal) byKey.set(`kode:${kodeVal.toLowerCase()}`, foundSrc);
        }
        if (pertanyaanColIndex >= 0 && cells[pertanyaanColIndex]) {
          const qVal = decodeHtmlEntities(
            cells[pertanyaanColIndex].replace(/<[^>]+>/g, '')
          ).trim();
          if (qVal) byKey.set(`q:${qVal.toLowerCase()}`, foundSrc);
        }
      }
      dataRowIndex++;
    }
  } catch {
    // Non-fatal
  }
  return { byRowIndex, byKey };
}

export interface FloatingSheetImage {
  col: number;
  row: number;
  mediaUrl: string;
}

function getZipEntryBuffer(files: Record<string, any>, zipPath: string): Buffer | null {
  const clean = zipPath.replace(/^\/+/, '');
  const entry = files[clean] || files[`/${clean}`];
  if (!entry || !entry.content) return null;
  return Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content);
}

function resolveZipTarget(baseFilePath: string, target: string): string {
  const cleanTarget = target.trim();
  if (cleanTarget.startsWith('/')) {
    return cleanTarget.replace(/^\/+/, '');
  }
  const dir = path.posix.dirname(baseFilePath.replace(/^\/+/, ''));
  return path.posix.normalize(path.posix.join(dir, cleanTarget));
}

function parseXmlAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = attrRegex.exec(tag)) !== null) {
    attrs[m[1]] = decodeHtmlEntities(m[2]);
  }
  return attrs;
}

function parseRelationshipsXml(xml: string): Array<{ id: string; type: string; target: string }> {
  const list: Array<{ id: string; type: string; target: string }> = [];
  const relRegex = /<Relationship\b([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = relRegex.exec(xml)) !== null) {
    const attrs = parseXmlAttributes(m[1]);
    if (attrs.Id && attrs.Target) {
      list.push({
        id: attrs.Id,
        type: attrs.Type || '',
        target: attrs.Target,
      });
    }
  }
  return list;
}

/**
 * Mengekstrak gambar yang di-insert ke spreadsheet via "Place over cells"
 * (gambar mengambang di atas sel) langsung dari file XLSX (xl/drawings + xl/media).
 */
export function extractWorkbookEmbeddedImages(
  wb: XLSX.WorkBook
): Map<string, FloatingSheetImage[]> {
  const result = new Map<string, FloatingSheetImage[]>();
  const files = (wb as any)?.files as Record<string, any> | undefined;
  if (!files) return result;

  try {
    const workbookBuf = getZipEntryBuffer(files, 'xl/workbook.xml');
    const workbookRelsBuf = getZipEntryBuffer(files, 'xl/_rels/workbook.xml.rels');
    if (!workbookBuf || !workbookRelsBuf) return result;

    const workbookXml = workbookBuf.toString('utf8');
    const workbookRels = parseRelationshipsXml(workbookRelsBuf.toString('utf8'));
    const relTargetById = new Map<string, string>();
    workbookRels.forEach((rel) => {
      relTargetById.set(rel.id, resolveZipTarget('xl/workbook.xml', rel.target));
    });

    const sheetTagRegex = /<(?:[a-z0-9_]+:)?sheet\b([^>]*?)\/?>/gi;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = sheetTagRegex.exec(workbookXml)) !== null) {
      const attrs = parseXmlAttributes(sMatch[1]);
      const sheetName = attrs.name;
      const rId = attrs['r:id'] || attrs.id;
      if (!sheetName || !rId) continue;

      const sheetXmlPath = relTargetById.get(rId);
      if (!sheetXmlPath) continue;

      const sheetDir = path.posix.dirname(sheetXmlPath);
      const sheetBase = path.posix.basename(sheetXmlPath);
      const sheetRelsPath = path.posix.join(sheetDir, '_rels', `${sheetBase}.rels`);
      const sheetRelsBuf = getZipEntryBuffer(files, sheetRelsPath);
      if (!sheetRelsBuf) continue;

      const sheetRels = parseRelationshipsXml(sheetRelsBuf.toString('utf8'));
      const drawingPaths = sheetRels
        .filter((r) => r.type.toLowerCase().includes('drawing') || r.target.includes('drawings/'))
        .map((r) => resolveZipTarget(sheetXmlPath, r.target));

      const sheetImages: FloatingSheetImage[] = [];

      for (const drawingPath of drawingPaths) {
        const drawingBuf = getZipEntryBuffer(files, drawingPath);
        if (!drawingBuf) continue;

        const drawingDir = path.posix.dirname(drawingPath);
        const drawingBase = path.posix.basename(drawingPath);
        const drawingRelsPath = path.posix.join(drawingDir, '_rels', `${drawingBase}.rels`);
        const drawingRelsBuf = getZipEntryBuffer(files, drawingRelsPath);
        if (!drawingRelsBuf) continue;

        const drawingRels = parseRelationshipsXml(drawingRelsBuf.toString('utf8'));
        const mediaByRelId = new Map<string, string>();
        drawingRels.forEach((r) => {
          mediaByRelId.set(r.id, resolveZipTarget(drawingPath, r.target));
        });

        const drawingXml = drawingBuf.toString('utf8');
        const anchorRegex =
          /<(?:[a-z0-9_]+:)?(?:twoCellAnchor|oneCellAnchor)\b[^>]*>([\s\S]*?)<\/(?:[a-z0-9_]+:)?(?:twoCellAnchor|oneCellAnchor)>/gi;
        let aMatch: RegExpExecArray | null;
        while ((aMatch = anchorRegex.exec(drawingXml)) !== null) {
          const anchorBody = aMatch[1];
          const fromMatch = anchorBody.match(
            /<(?:[a-z0-9_]+:)?from>([\s\S]*?)<\/(?:[a-z0-9_]+:)?from>/i
          );
          if (!fromMatch) continue;

          const colMatch = fromMatch[1].match(
            /<(?:[a-z0-9_]+:)?col>(\d+)<\/(?:[a-z0-9_]+:)?col>/i
          );
          const rowMatch = fromMatch[1].match(
            /<(?:[a-z0-9_]+:)?row>(\d+)<\/(?:[a-z0-9_]+:)?row>/i
          );
          if (!colMatch || !rowMatch) continue;

          const blipMatch = anchorBody.match(
            /<(?:[a-z0-9_]+:)?blip\b[^>]*\b(?:r:)?embed=["']([^"']+)["']/i
          );
          if (!blipMatch || !blipMatch[1]) continue;

          const mediaPath = mediaByRelId.get(blipMatch[1]);
          if (!mediaPath) continue;

          const mediaBuf = getZipEntryBuffer(files, mediaPath);
          if (!mediaBuf || mediaBuf.length === 0) continue;

          const mediaUrl = registerSheetMedia(mediaBuf, mediaPath);
          sheetImages.push({
            col: Number(colMatch[1]),
            row: Number(rowMatch[1]),
            mediaUrl,
          });
        }
      }

      if (sheetImages.length > 0) {
        result.set(sheetName, sheetImages);
      }
    }
  } catch {
    // Non-fatal
  }

  return result;
}

export interface WorkbookExportResult {
  topics: TopicPackage[] | null;
  errorReason?: string;
}

/**
 * Mengunduh & memparsing seluruh workbook Google Sheets (.xlsx) secara otomatis,
 * sehingga seluruh tab sheet terdeteksi 100% sesuai jumlah sheet yang ada.
 */
export async function fetchWorkbookSheetsFromExport(
  sheetId: string,
  gidLookup: Map<string, string>,
  isPublished = false
): Promise<WorkbookExportResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 16000);
    const exportUrl = isPublished
      ? `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=xlsx`
      : `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const res = await fetch(exportUrl, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          topics: null,
          errorReason:
            'Akses Google Spreadsheet ditolak (HTTP ' +
            res.status +
            '). Pastikan Bagikan diset ke "Siapa saja yang memiliki link (Pelihat)".',
        };
      }
      if (res.status === 404) {
        return {
          topics: null,
          errorReason: 'Link atau ID Google Spreadsheet tidak ditemukan (HTTP 404).',
        };
      }
      return {
        topics: null,
        errorReason: `Gagal mengunduh Google Spreadsheet (HTTP ${res.status}).`,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (res.url.includes('accounts.google.com') || contentType.includes('text/html')) {
      return {
        topics: null,
        errorReason:
          'Google Spreadsheet masih meminta login Google. Ubah pengaturan Bagikan menjadi "Siapa saja yang memiliki link (Pelihat)".',
      };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true, bookFiles: true });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { topics: null, errorReason: 'Tidak ada tab sheet di dalam spreadsheet.' };
    }

    const floatingImagesBySheet = extractWorkbookEmbeddedImages(wb);

    const activeSheets = wb.SheetNames.filter(
      (s) => !IGNORED_SHEET_TABS.has(s.trim().toLowerCase())
    );
    if (activeSheets.length === 0) {
      return {
        topics: null,
        errorReason:
          'Spreadsheet baru berisi sheet panduan ("Contoh"). Hapus atau buat tab sheet baru untuk topik soal Anda, lalu klik Muat Ulang.',
      };
    }

    // Pindai gambar sel HTML secara paralel untuk seluruh sheet yang punya gid
    const cellImageMapBySheet = new Map<string, HtmlCellImageLookup>();
    if (!isPublished) {
      await Promise.all(
        activeSheets.map(async (sheetName) => {
          const gid = gidLookup.get(sheetName.trim().toLowerCase()) || '';
          if (gid) {
            const imgs = await fetchSheetHtmlCellImages(sheetId, gid);
            cellImageMapBySheet.set(sheetName, imgs);
          }
        })
      );
    }

    const loadedTopics: TopicPackage[] = [];

    for (const sheetName of activeSheets) {
      const ws = wb.Sheets[sheetName];
      if (!ws || !ws['!ref']) continue;

      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: '',
        raw: false,
      });
      if (matrix.length < 2) continue;

      const headers = (matrix[0] || []).map((h) => String(h || '').trim());
      if (!headers.some(Boolean)) continue;

      // Ambil juga formula =IMAGE(...) bila ada di sel kolom Gambar
      const range = XLSX.utils.decode_range(ws['!ref']);
      const gambarColIdx = headers.findIndex((h) => {
        const n = normalizeHeaderKey(h);
        return n === 'gambar' || n === 'image' || n === 'urlgambar';
      });

      const cellImages: HtmlCellImageLookup = cellImageMapBySheet.get(sheetName) || {
        byRowIndex: new Map<number, string>(),
        byKey: new Map<string, string>(),
      };
      const floatingImages = floatingImagesBySheet.get(sheetName) || [];

      const topicId = loadedTopics.length + 1;
      const questions: RawQuestion[] = [];

      let dataRowIndex = 0;
      for (let r = 1; r < matrix.length; r++) {
        const rowArr = matrix[r] || [];
        const rowObj: Record<string, unknown> = {};
        let hasValue = false;

        headers.forEach((h, cIdx) => {
          if (!h) return;
          let val = String(rowArr[cIdx] ?? '').trim();

          // Cek formula =IMAGE("...") langsung dari sel XLSX
          if (cIdx === gambarColIdx && !val) {
            const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + cIdx });
            const cell = ws[addr];
            if (cell?.f) {
              val = `=${cell.f}`;
            }
          }

          if (val) hasValue = true;
          rowObj[h] = val;
        });

        const actualExcelRow = range.s.r + r;
        const floatingMatch =
          (gambarColIdx >= 0
            ? floatingImages.find((img) => img.row === actualExcelRow && img.col === gambarColIdx)
            : undefined) || floatingImages.find((img) => img.row === actualExcelRow);

        const kodeText = String(rowObj.Kode ?? rowObj.kode ?? rowObj.Code ?? rowObj.code ?? '').trim();
        const qText = String(
          rowObj.Pertanyaan ?? rowObj.pertanyaan ?? rowObj.Soal ?? rowObj.soal ?? ''
        ).trim();
        const scannedImg =
          (kodeText ? cellImages.byKey.get(`kode:${kodeText.toLowerCase()}`) : undefined) ||
          (qText ? cellImages.byKey.get(`q:${qText.toLowerCase()}`) : undefined) ||
          cellImages.byRowIndex.get(dataRowIndex);

        const existingImg = String(
          rowObj.Gambar ?? rowObj.gambar ?? rowObj.Image ?? rowObj.image ?? ''
        ).trim();

        if (floatingMatch) {
          rowObj.Gambar = floatingMatch.mediaUrl;
          hasValue = true;
        } else if (scannedImg && (!existingImg || existingImg === 'CellImage')) {
          rowObj.Gambar = scannedImg;
          hasValue = true;
        }

        if (!hasValue) continue;

        const q = rowObjectToQuestion(rowObj, topicId, dataRowIndex);
        if (q) questions.push(q);
        dataRowIndex++;
      }

      if (questions.length > 0) {
        const { nama, judul } = parseSheetNameToTitle(sheetName, topicId);
        loadedTopics.push({
          id: topicId,
          sheetName,
          nama,
          judul,
          ikon: TOPIC_ICONS[(topicId - 1) % TOPIC_ICONS.length],
          deskripsi: `${questions.length} soal aktif dari sheet "${sheetName}"`,
          warnaAksen: TOPIC_ACCENTS[(topicId - 1) % TOPIC_ACCENTS.length],
          soal: questions,
        });
      }
    }

    if (loadedTopics.length === 0) {
      return {
        topics: null,
        errorReason:
          'Spreadsheet terbaca, tetapi tidak ditemukan soal valid. Pastikan Baris 1 berisi kolom header: Kode | Pertanyaan | Gambar | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Jawaban Benar.',
      };
    }

    return { topics: loadedTopics };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        topics: null,
        errorReason: 'Koneksi ke Google Spreadsheet timeout (>16 detik). Silakan coba ulangi.',
      };
    }
    return {
      topics: null,
      errorReason: err?.message || 'Gagal membaca file spreadsheet.',
    };
  }
}
