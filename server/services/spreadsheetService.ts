import { RawQuestion, TopicPackage } from '../../src/types/quiz.ts';
import { readJsonFile, writeJsonFile, SPREADSHEET_CONFIG_FILE } from '../lib/jsonStore.ts';
import {
  IGNORED_SHEET_TABS,
  TOPIC_ACCENTS,
  TOPIC_ICONS,
  discoverGoogleSheetTabs,
  extractSpreadsheetId,
  fetchSheetHtmlCellImages,
  fetchWorkbookSheetsFromExport,
  normalizeSpreadsheetImageUrl,
  parseCorrectIndex,
  parseGvizJson,
  parseSheetNameToTitle,
  rowObjectToQuestion,
} from '../lib/sheetParsers.ts';
import type { LiveQuestionsCache, SpreadsheetConfig } from '../types.ts';

const CACHE_TTL_MS = 45 * 1000;

let spreadsheetConfig: SpreadsheetConfig = readJsonFile<SpreadsheetConfig>(
  SPREADSHEET_CONFIG_FILE,
  {
    spreadsheetUrlOrId: process.env.GOOGLE_SHEET_ID || '',
    appsScriptUrl: process.env.GOOGLE_QUESTIONS_SCRIPT_URL || '',
    sheetNames: [],
    enabled: true,
  }
);

let liveCache: LiveQuestionsCache | null = null;

async function fetchFromGoogleSheetId(
  sheetId: string
): Promise<{ topics: TopicPackage[] } | null> {
  // 1. Scan seluruh tab + gid dari /htmlview secara otomatis
  const discoveredTabs = await discoverGoogleSheetTabs(sheetId);
  const gidLookup = new Map<string, string>();
  discoveredTabs.forEach((t) => gidLookup.set(t.name.trim().toLowerCase(), t.gid));

  // 2. Prioritas: unduh workbook XLSX resmi agar 100% seluruh sheet terdeteksi otomatis & akurat
  const fromExport = await fetchWorkbookSheetsFromExport(sheetId, gidLookup);
  if (fromExport && fromExport.length > 0) {
    return { topics: fromExport };
  }

  // 3. Cadangan: scan tiap tab dari daftar discoveredTabs via gviz + htmlview cell images
  if (discoveredTabs.length === 0) {
    return null;
  }

  const loadedTopics: TopicPackage[] = [];

  for (const tab of discoveredTabs) {
    if (IGNORED_SHEET_TABS.has(tab.name.toLowerCase())) continue;

    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        tab.name
      )}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const [gvizRes, cellImages] = await Promise.all([
        fetch(gvizUrl, { signal: controller.signal }),
        tab.gid
          ? fetchSheetHtmlCellImages(sheetId, tab.gid)
          : Promise.resolve({
              byRowIndex: new Map<number, string>(),
              byKey: new Map<string, string>(),
            }),
      ]);
      clearTimeout(timer);

      if (!gvizRes.ok) continue;
      const text = await gvizRes.text();
      const parsed = parseGvizJson(text);
      if (!parsed || parsed.rows.length === 0) continue;

      const topicId = loadedTopics.length + 1;
      const questions: RawQuestion[] = [];

      parsed.rows.forEach((rowObj, rIdx) => {
        const mergedRow: Record<string, unknown> = { ...rowObj };
        const kodeText = String(
          mergedRow.Kode ?? mergedRow.kode ?? mergedRow.Code ?? mergedRow.code ?? ''
        ).trim();
        const qText = String(
          mergedRow.Pertanyaan ?? mergedRow.pertanyaan ?? mergedRow.Soal ?? mergedRow.soal ?? ''
        ).trim();
        const scannedImg =
          (kodeText ? cellImages.byKey.get(`kode:${kodeText.toLowerCase()}`) : undefined) ||
          (qText ? cellImages.byKey.get(`q:${qText.toLowerCase()}`) : undefined) ||
          cellImages.byRowIndex.get(rIdx);

        const existingGambar = String(
          mergedRow.Gambar ?? mergedRow.gambar ?? mergedRow.Image ?? mergedRow.image ?? ''
        ).trim();

        if ((!existingGambar || existingGambar === 'CellImage') && scannedImg) {
          mergedRow.Gambar = scannedImg;
        }

        const q = rowObjectToQuestion(mergedRow, topicId, rIdx);
        if (q) questions.push(q);
      });

      if (questions.length > 0) {
        const { nama, judul } = parseSheetNameToTitle(tab.name, topicId);
        loadedTopics.push({
          id: topicId,
          nama,
          judul,
          ikon: TOPIC_ICONS[(topicId - 1) % TOPIC_ICONS.length],
          deskripsi: `${questions.length} soal aktif dari sheet "${tab.name}"`,
          warnaAksen: TOPIC_ACCENTS[(topicId - 1) % TOPIC_ACCENTS.length],
          soal: questions,
        });
      }
    } catch {
      // Lewati tab yang gagal di-parse
    }
  }

  return loadedTopics.length > 0 ? { topics: loadedTopics } : null;
}

async function fetchFromAppsScript(scriptUrl: string): Promise<TopicPackage[] | null> {
  const cleanUrl = (scriptUrl || '').trim();
  if (!cleanUrl) return null;

  try {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const targetUrl = `${cleanUrl}${separator}action=questions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(targetUrl, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);

    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
      return null;
    }

    const data = JSON.parse(text);
    const rawSheets: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data.topics)
      ? data.topics
      : Array.isArray(data.sheets)
      ? data.sheets
      : [];

    if (rawSheets.length === 0) return null;

    const loadedTopics: TopicPackage[] = [];

    rawSheets.forEach((sheetItem: any, idx: number) => {
      const sheetName = String(
        sheetItem.sheetName || sheetItem.judul || sheetItem.name || `Topik ${idx + 1}`
      );
      if (IGNORED_SHEET_TABS.has(sheetName.toLowerCase())) return;

      const rawRows: any[] = Array.isArray(sheetItem.questions)
        ? sheetItem.questions
        : Array.isArray(sheetItem.soal)
        ? sheetItem.soal
        : Array.isArray(sheetItem.rows)
        ? sheetItem.rows
        : [];

      const topicId = loadedTopics.length + 1;
      const questions: RawQuestion[] = [];

      rawRows.forEach((row: any, rIdx: number) => {
        if (row && typeof row === 'object') {
          if (Array.isArray(row.pilihan) && row.pilihan.length === 4 && row.pertanyaan) {
            const opts: [string, string, string, string] = [
              String(row.pilihan[0] ?? ''),
              String(row.pilihan[1] ?? ''),
              String(row.pilihan[2] ?? ''),
              String(row.pilihan[3] ?? ''),
            ];
            questions.push({
              kode: String(row.kode || `T${topicId}-${String(rIdx + 1).padStart(2, '0')}`),
              pertanyaan: String(row.pertanyaan),
              gambar: normalizeSpreadsheetImageUrl(String(row.gambar || '')),
              pilihan: opts,
              jawabanBenar: parseCorrectIndex(row.jawabanBenar, opts),
            });
          } else {
            const parsedQ = rowObjectToQuestion(row, topicId, rIdx);
            if (parsedQ) questions.push(parsedQ);
          }
        }
      });

      if (questions.length > 0) {
        const { nama, judul } = parseSheetNameToTitle(sheetName, topicId);
        loadedTopics.push({
          id: topicId,
          nama: String(sheetItem.nama || nama),
          judul: String(sheetItem.judul || judul),
          ikon: String(sheetItem.ikon || TOPIC_ICONS[(topicId - 1) % TOPIC_ICONS.length]),
          deskripsi: String(
            sheetItem.deskripsi || `${questions.length} soal live dari sheet "${sheetName}"`
          ),
          warnaAksen: TOPIC_ACCENTS[(topicId - 1) % TOPIC_ACCENTS.length],
          soal: questions,
        });
      }
    });

    return loadedTopics.length > 0 ? loadedTopics : null;
  } catch {
    return null;
  }
}

export function getSpreadsheetConfig(): SpreadsheetConfig {
  return spreadsheetConfig;
}

export function updateSpreadsheetConfigState(input: Partial<SpreadsheetConfig>): SpreadsheetConfig {
  spreadsheetConfig = {
    spreadsheetUrlOrId: String(
      input.spreadsheetUrlOrId ?? spreadsheetConfig.spreadsheetUrlOrId
    ).trim(),
    appsScriptUrl: String(input.appsScriptUrl ?? spreadsheetConfig.appsScriptUrl).trim(),
    sheetNames: [], // Selalu scan otomatis seluruh sheet dari spreadsheet
    enabled: typeof input.enabled === 'boolean' ? input.enabled : spreadsheetConfig.enabled,
  };
  writeJsonFile(SPREADSHEET_CONFIG_FILE, spreadsheetConfig);
  return spreadsheetConfig;
}

export async function getLiveTopics(forceRefresh = false): Promise<LiveQuestionsCache> {
  const now = Date.now();
  if (!forceRefresh && liveCache && now - liveCache.fetchedAtMs < CACHE_TTL_MS) {
    return liveCache;
  }

  let warning: string | undefined;

  if (spreadsheetConfig.enabled) {
    const sheetId = extractSpreadsheetId(spreadsheetConfig.spreadsheetUrlOrId);

    if (spreadsheetConfig.appsScriptUrl && spreadsheetConfig.appsScriptUrl.trim()) {
      const fromGas = await fetchFromAppsScript(spreadsheetConfig.appsScriptUrl);
      if (fromGas && fromGas.length > 0) {
        const recordMap: Record<number, TopicPackage> = {};
        let totalQ = 0;
        fromGas.forEach((t) => {
          recordMap[t.id] = t;
          totalQ += t.soal.length;
        });

        liveCache = {
          topics: recordMap,
          source: 'apps_script',
          lastSyncedAt: new Date().toISOString(),
          sheetTopicsCount: fromGas.length,
          totalLiveQuestions: totalQ,
          fetchedAtMs: now,
        };
        return liveCache;
      }
    }

    if (sheetId) {
      const fromSheet = await fetchFromGoogleSheetId(sheetId);
      if (fromSheet && fromSheet.topics.length > 0) {
        const recordMap: Record<number, TopicPackage> = {};
        let totalQ = 0;
        fromSheet.topics.forEach((t) => {
          recordMap[t.id] = t;
          totalQ += t.soal.length;
        });

        liveCache = {
          topics: recordMap,
          source: 'spreadsheet',
          lastSyncedAt: new Date().toISOString(),
          sheetTopicsCount: fromSheet.topics.length,
          totalLiveQuestions: totalQ,
          fetchedAtMs: now,
        };
        return liveCache;
      } else {
        warning =
          'Gagal memindai tab soal dari Google Spreadsheet. Pastikan link dibagikan "Siapa saja dapat melihat" dan baris 1 berisi header yang sesuai.';
      }
    } else {
      warning =
        'Link Google Spreadsheet belum diisi. Unduh template Excel (.xlsx) di Admin, unggah ke Google Sheets, lalu tempelkan link-nya di tab Live Soal.';
    }
  } else {
    warning = 'Sinkronisasi spreadsheet sedang dinonaktifkan di Pengaturan Admin.';
  }

  liveCache = {
    topics: {},
    source: 'unconfigured',
    lastSyncedAt: new Date().toISOString(),
    sheetTopicsCount: 0,
    totalLiveQuestions: 0,
    warning,
    fetchedAtMs: now,
  };
  return liveCache;
}
