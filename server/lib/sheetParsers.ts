import * as XLSX from 'xlsx';
import { RawQuestion, TopicPackage } from '../../src/types/quiz.ts';

export const IGNORED_SHEET_TABS = new Set([
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

export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = (urlOrId || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return '';
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

/**
 * Mengunduh & memparsing seluruh workbook Google Sheets (.xlsx) secara otomatis,
 * sehingga seluruh tab sheet terdeteksi 100% sesuai jumlah sheet yang ada.
 */
export async function fetchWorkbookSheetsFromExport(
  sheetId: string,
  gidLookup: Map<string, string>
): Promise<TopicPackage[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
      { signal: controller.signal, redirect: 'follow' }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });
    if (!wb.SheetNames || wb.SheetNames.length === 0) return null;

    const loadedTopics: TopicPackage[] = [];

    for (const sheetName of wb.SheetNames) {
      if (IGNORED_SHEET_TABS.has(sheetName.trim().toLowerCase())) continue;

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

      const gid = gidLookup.get(sheetName.trim().toLowerCase()) || '';
      const cellImages: HtmlCellImageLookup = gid
        ? await fetchSheetHtmlCellImages(sheetId, gid)
        : { byRowIndex: new Map<number, string>(), byKey: new Map<string, string>() };

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

        const kodeText = String(rowObj.Kode ?? rowObj.kode ?? rowObj.Code ?? rowObj.code ?? '').trim();
        const qText = String(
          rowObj.Pertanyaan ?? rowObj.pertanyaan ?? rowObj.Soal ?? rowObj.soal ?? ''
        ).trim();
        const scannedImg =
          (kodeText ? cellImages.byKey.get(`kode:${kodeText.toLowerCase()}`) : undefined) ||
          (qText ? cellImages.byKey.get(`q:${qText.toLowerCase()}`) : undefined) ||
          cellImages.byRowIndex.get(dataRowIndex);

        if (scannedImg) {
          const existingImg = String(
            rowObj.Gambar ?? rowObj.gambar ?? rowObj.Image ?? rowObj.image ?? ''
          ).trim();
          if (!existingImg || existingImg === 'CellImage') {
            rowObj.Gambar = scannedImg;
            hasValue = true;
          }
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
          nama,
          judul,
          ikon: TOPIC_ICONS[(topicId - 1) % TOPIC_ICONS.length],
          deskripsi: `${questions.length} soal aktif dari sheet "${sheetName}"`,
          warnaAksen: TOPIC_ACCENTS[(topicId - 1) % TOPIC_ACCENTS.length],
          soal: questions,
        });
      }
    }

    return loadedTopics.length > 0 ? loadedTopics : null;
  } catch {
    return null;
  }
}
