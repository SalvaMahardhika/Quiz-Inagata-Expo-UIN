import { RawQuestion, TopicPackage } from '../../src/types/quiz.ts';
import { fsGetDoc, fsSetDoc, isFirestoreConfigured } from '../lib/firestoreStore.ts';
import { readJsonFile, writeJsonFile, SPREADSHEET_CONFIG_FILE } from '../lib/jsonStore.ts';
import {
  IGNORED_SHEET_TABS,
  TOPIC_ACCENTS,
  TOPIC_ICONS,
  discoverGoogleSheetTabs,
  extractAppsScriptDeploymentId,
  fetchSheetHtmlCellImages,
  fetchWorkbookSheetsFromExport,
  normalizeAppsScriptUrl,
  normalizeSpreadsheetImageUrl,
  parseCorrectIndex,
  parseGvizJson,
  parseSheetNameToTitle,
  parseSpreadsheetTarget,
  rowObjectToQuestion,
} from '../lib/sheetParsers.ts';
import type { AdminTopicItem, LiveQuestionsCache, SpreadsheetConfig } from '../types.ts';

const CACHE_TTL_MS = 45 * 1000;
export const MIN_QUESTIONS_PER_TOPIC = 10;

export function normalizeSheetKey(value: string): string {
  return String(value || '').trim().toLowerCase();
}

const initialScriptUrl = normalizeAppsScriptUrl(
  process.env.GOOGLE_QUESTIONS_SCRIPT_URL || ''
);
let spreadsheetConfig: SpreadsheetConfig = readJsonFile<SpreadsheetConfig>(
  SPREADSHEET_CONFIG_FILE,
  {
    spreadsheetUrlOrId: process.env.GOOGLE_SHEET_ID || '',
    appsScriptUrl: initialScriptUrl,
    deploymentId: extractAppsScriptDeploymentId(initialScriptUrl),
    sheetNames: [],
    disabledSheets: [],
    enabled: true,
  }
);
spreadsheetConfig = {
  ...spreadsheetConfig,
  deploymentId:
    spreadsheetConfig.deploymentId ||
    extractAppsScriptDeploymentId(spreadsheetConfig.appsScriptUrl || ''),
  appsScriptUrl: normalizeAppsScriptUrl(
    spreadsheetConfig.appsScriptUrl || spreadsheetConfig.deploymentId || ''
  ),
  disabledSheets: Array.isArray(spreadsheetConfig.disabledSheets)
    ? Array.from(
        new Set(spreadsheetConfig.disabledSheets.map(normalizeSheetKey).filter(Boolean))
      )
    : [],
};

interface RawFetchCache {
  topics: TopicPackage[];
  source: 'spreadsheet' | 'apps_script' | 'unconfigured';
  warning?: string;
  lastSyncedAt: string;
  fetchedAtMs: number;
}

let rawFetchCache: RawFetchCache | null = null;
let liveCache: LiveQuestionsCache | null = null;

function buildLiveSnapshot(raw: RawFetchCache): LiveQuestionsCache {
  const disabledSet = new Set(
    (spreadsheetConfig.disabledSheets || []).map(normalizeSheetKey).filter(Boolean)
  );

  const playableMap: Record<number, TopicPackage> = {};
  const adminTopics: AdminTopicItem[] = [];
  let playableTopicsCount = 0;
  let totalLiveQuestions = 0;

  for (const topic of raw.topics) {
    const sheetName = topic.sheetName || `${topic.nama}: ${topic.judul}`;
    const sheetKey = normalizeSheetKey(sheetName);
    const questionCount = Array.isArray(topic.soal) ? topic.soal.length : 0;
    const meetsMinQuestions = questionCount >= MIN_QUESTIONS_PER_TOPIC;
    const disabled = disabledSet.has(sheetKey);
    const activeForPlayers = meetsMinQuestions && !disabled;

    adminTopics.push({
      id: topic.id,
      sheetKey,
      sheetName,
      nama: topic.nama,
      judul: topic.judul,
      questionCount,
      meetsMinQuestions,
      disabled,
      activeForPlayers,
      soal: topic.soal,
    });

    if (activeForPlayers) {
      playableMap[topic.id] = topic;
      playableTopicsCount++;
      totalLiveQuestions += questionCount;
    }
  }

  let warning = raw.warning;
  if (spreadsheetConfig.enabled && raw.topics.length > 0) {
    if (playableTopicsCount === 0) {
      const enabledCount = adminTopics.filter((t) => !t.disabled).length;
      warning =
        enabledCount === 0
          ? 'Semua topik soal sedang dinonaktifkan dari Panel Admin.'
          : `Belum ada topik yang memiliki minimal ${MIN_QUESTIONS_PER_TOPIC} soal aktif. Tambahkan minimal ${MIN_QUESTIONS_PER_TOPIC} soal per sheet agar muncul di kuis.`;
    } else {
      warning = undefined;
    }
  }

  return {
    topics: playableMap,
    adminTopics,
    source: raw.source,
    lastSyncedAt: raw.lastSyncedAt,
    sheetTopicsCount: playableTopicsCount,
    totalLiveQuestions,
    warning,
    fetchedAtMs: raw.fetchedAtMs,
  };
}

async function fetchFromGoogleSheetId(
  sheetId: string,
  isPublished = false
): Promise<{ topics: TopicPackage[] | null; errorReason?: string }> {
  // 1. Scan seluruh tab + gid dari /htmlview secara otomatis (hanya untuk sheet standar)
  const discoveredTabs = isPublished ? [] : await discoverGoogleSheetTabs(sheetId);
  const gidLookup = new Map<string, string>();
  discoveredTabs.forEach((t) => gidLookup.set(t.name.trim().toLowerCase(), t.gid));

  // 2. Prioritas: unduh workbook XLSX resmi agar 100% seluruh sheet terdeteksi otomatis & akurat
  const fromExport = await fetchWorkbookSheetsFromExport(sheetId, gidLookup, isPublished);
  if (fromExport.topics && fromExport.topics.length > 0) {
    return { topics: fromExport.topics };
  }

  // 3. Cadangan: scan tiap tab dari daftar discoveredTabs via gviz + htmlview cell images
  if (discoveredTabs.length === 0) {
    return { topics: null, errorReason: fromExport.errorReason };
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
          sheetName: tab.name,
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

  if (loadedTopics.length > 0) {
    return { topics: loadedTopics };
  }
  return { topics: null, errorReason: fromExport.errorReason };
}

async function fetchFromAppsScript(
  scriptUrl: string,
  spreadsheetId = ''
): Promise<{ topics: TopicPackage[] | null; errorReason?: string }> {
  const cleanUrl = normalizeAppsScriptUrl(scriptUrl);
  if (!cleanUrl) return { topics: null };

  if (cleanUrl.includes('docs.google.com/spreadsheets/')) {
    return {
      topics: null,
      errorReason:
        'Kolom Apps Script berisi link Google Spreadsheet, bukan URL Aplikasi Web (/macros/s/.../exec).',
    };
  }
  if (cleanUrl.includes('/macros/library/')) {
    return {
      topics: null,
      errorReason:
        'URL yang dimasukkan adalah URL Library, bukan URL Aplikasi Web (/exec).',
    };
  }
  if (/\/dev(\?|$)/i.test(cleanUrl)) {
    return {
      topics: null,
      errorReason:
        'Gunakan URL Aplikasi Web berakhiran /exec, bukan /dev (khusus mode edit pribadi).',
    };
  }

  try {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const ssParam = spreadsheetId ? `&spreadsheetId=${encodeURIComponent(spreadsheetId)}` : '';
    const targetUrl = `${cleanUrl}${separator}action=questions${ssParam}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(targetUrl, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        topics: null,
        errorReason: `Apps Script Bank Soal merespons HTTP ${res.status}. Pastikan akses diset ke "Siapa saja (Anyone)".`,
      };
    }

    const text = await res.text();
    if (res.url.includes('accounts.google.com') || /^\s*</.test(text)) {
      if (text.includes('Script function not found')) {
        return {
          topics: null,
          errorReason:
            'Fungsi doGet(e) tidak ditemukan di Apps Script Bank Soal. Salin kode doGet dari Panduan lalu Deploy Versi Baru.',
        };
      }
      return {
        topics: null,
        errorReason:
          'Apps Script Bank Soal mengembalikan halaman HTML/login Google. Pastikan "Yang memiliki akses" diset ke "Siapa saja (Anyone)" dan sudah Deploy Versi Baru.',
      };
    }

    const data = JSON.parse(text);
    if (data && typeof data === 'object' && !Array.isArray(data) && data.ok === false) {
      return {
        topics: null,
        errorReason: String(data.error || 'Apps Script Bank Soal mengembalikan error.'),
      };
    }
    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      String(data.service || '').toLowerCase().includes('daftar peserta')
    ) {
      return {
        topics: null,
        errorReason:
          'URL Apps Script yang dimasukkan adalah milik Spreadsheet Daftar Peserta (hanya doPost), bukan Apps Script Bank Soal (doGet topics).',
      };
    }

    const rawSheets: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data.topics)
      ? data.topics
      : Array.isArray(data.sheets)
      ? data.sheets
      : [];

    if (rawSheets.length === 0) {
      return {
        topics: null,
        errorReason:
          'Apps Script aktif, tetapi tidak menghasilkan daftar soal (`topics` kosong). Periksa sheet soal Anda memiliki Baris 1 header & minimal 1 soal.',
      };
    }

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
          sheetName,
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

    if (loadedTopics.length === 0) {
      return {
        topics: null,
        errorReason:
          'Apps Script terhubung, namun tidak ada soal valid yang cocok dengan header (Kode, Pertanyaan, Pilihan A..D, Jawaban Benar).',
      };
    }
    return { topics: loadedTopics };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        topics: null,
        errorReason: 'Koneksi ke Apps Script Bank Soal timeout (>20 detik).',
      };
    }
    return {
      topics: null,
      errorReason: err?.message || 'Gagal membaca JSON dari Apps Script Bank Soal.',
    };
  }
}

const SPREADSHEET_COLLECTION = 'spreadsheet_configs';
const SPREADSHEET_DOC_ID = 'default';
let spreadsheetLoadPromise: Promise<void> | null = null;
let spreadsheetLoadedFromFirestore = false;

interface FirestoreSpreadsheetDoc extends SpreadsheetConfig {
  updatedAt?: string;
}

function toFirestoreSpreadsheetDoc(cfg: SpreadsheetConfig): Record<string, unknown> {
  return {
    spreadsheetUrlOrId: String(cfg.spreadsheetUrlOrId || '').slice(0, 500),
    appsScriptUrl: String(cfg.appsScriptUrl || '').slice(0, 500),
    deploymentId: String(cfg.deploymentId || '').slice(0, 200),
    sheetNames: Array.isArray(cfg.sheetNames)
      ? cfg.sheetNames.slice(0, 50).map((s) => String(s).slice(0, 120))
      : [],
    disabledSheets: Array.isArray(cfg.disabledSheets)
      ? cfg.disabledSheets.slice(0, 50).map((s) => String(s).slice(0, 120))
      : [],
    enabled: Boolean(cfg.enabled),
    updatedAt: new Date().toISOString(),
  };
}

export async function ensureSpreadsheetConfigLoaded(): Promise<void> {
  if (spreadsheetLoadedFromFirestore || !isFirestoreConfigured()) return;
  if (!spreadsheetLoadPromise) {
    spreadsheetLoadPromise = (async () => {
      try {
        const remote = await fsGetDoc<FirestoreSpreadsheetDoc>(
          SPREADSHEET_COLLECTION,
          SPREADSHEET_DOC_ID
        );
        if (remote) {
          const resolvedUrl = normalizeAppsScriptUrl(
            remote.appsScriptUrl || remote.deploymentId || ''
          );
          spreadsheetConfig = {
            spreadsheetUrlOrId: String(remote.spreadsheetUrlOrId || '').trim(),
            appsScriptUrl: resolvedUrl,
            deploymentId:
              String(remote.deploymentId || '').trim() ||
              extractAppsScriptDeploymentId(resolvedUrl),
            sheetNames: Array.isArray(remote.sheetNames) ? remote.sheetNames : [],
            disabledSheets: Array.isArray(remote.disabledSheets)
              ? Array.from(
                  new Set(remote.disabledSheets.map(normalizeSheetKey).filter(Boolean))
                )
              : [],
            enabled: typeof remote.enabled === 'boolean' ? remote.enabled : true,
          };
          writeJsonFile(SPREADSHEET_CONFIG_FILE, spreadsheetConfig);
          rawFetchCache = null;
          liveCache = null;
        } else if (
          spreadsheetConfig.spreadsheetUrlOrId ||
          spreadsheetConfig.appsScriptUrl ||
          spreadsheetConfig.deploymentId ||
          (spreadsheetConfig.disabledSheets && spreadsheetConfig.disabledSheets.length > 0)
        ) {
          await fsSetDoc(
            SPREADSHEET_COLLECTION,
            SPREADSHEET_DOC_ID,
            toFirestoreSpreadsheetDoc(spreadsheetConfig)
          );
        }
        spreadsheetLoadedFromFirestore = true;
      } catch (err) {
        console.error('Gagal memuat konfigurasi spreadsheet dari Firestore:', err);
      } finally {
        spreadsheetLoadPromise = null;
      }
    })();
  }
  await spreadsheetLoadPromise;
}

export async function getSpreadsheetConfig(): Promise<SpreadsheetConfig> {
  await ensureSpreadsheetConfigLoaded();
  return spreadsheetConfig;
}

export async function updateSpreadsheetConfigState(input: Partial<SpreadsheetConfig>): Promise<{
  config: SpreadsheetConfig;
  connectionChanged: boolean;
}> {
  await ensureSpreadsheetConfigLoaded();
  const prev = spreadsheetConfig;
  const rawUrl = String(input.appsScriptUrl ?? spreadsheetConfig.appsScriptUrl ?? '').trim();
  const rawDepId = String(input.deploymentId ?? '').trim();

  const resolvedUrl = normalizeAppsScriptUrl(rawUrl || rawDepId);
  const resolvedDepId =
    extractAppsScriptDeploymentId(rawDepId) ||
    extractAppsScriptDeploymentId(resolvedUrl);

  const nextDisabledSheets = Array.isArray(input.disabledSheets)
    ? Array.from(new Set(input.disabledSheets.map(normalizeSheetKey).filter(Boolean)))
    : spreadsheetConfig.disabledSheets || [];

  spreadsheetConfig = {
    spreadsheetUrlOrId: String(
      input.spreadsheetUrlOrId ?? spreadsheetConfig.spreadsheetUrlOrId
    ).trim(),
    appsScriptUrl: resolvedUrl,
    deploymentId: resolvedDepId,
    sheetNames: [], // Selalu scan otomatis seluruh sheet dari spreadsheet
    disabledSheets: nextDisabledSheets,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : spreadsheetConfig.enabled,
  };
  writeJsonFile(SPREADSHEET_CONFIG_FILE, spreadsheetConfig);

  if (isFirestoreConfigured()) {
    try {
      await fsSetDoc(
        SPREADSHEET_COLLECTION,
        SPREADSHEET_DOC_ID,
        toFirestoreSpreadsheetDoc(spreadsheetConfig)
      );
    } catch (err) {
      console.error('Gagal menyimpan konfigurasi spreadsheet ke Firestore:', err);
    }
  }

  const connectionChanged =
    prev.spreadsheetUrlOrId !== spreadsheetConfig.spreadsheetUrlOrId ||
    prev.appsScriptUrl !== spreadsheetConfig.appsScriptUrl ||
    prev.deploymentId !== spreadsheetConfig.deploymentId ||
    prev.enabled !== spreadsheetConfig.enabled;

  if (!connectionChanged && rawFetchCache) {
    liveCache = buildLiveSnapshot(rawFetchCache);
  }

  return { config: spreadsheetConfig, connectionChanged };
}

export async function getLiveTopics(forceRefresh = false): Promise<LiveQuestionsCache> {
  await ensureSpreadsheetConfigLoaded();
  const now = Date.now();
  if (!forceRefresh && liveCache && now - liveCache.fetchedAtMs < CACHE_TTL_MS) {
    return liveCache;
  }

  let warning: string | undefined;

  if (spreadsheetConfig.enabled) {
    const target = parseSpreadsheetTarget(spreadsheetConfig.spreadsheetUrlOrId);
    const effectiveScriptUrl = normalizeAppsScriptUrl(
      spreadsheetConfig.appsScriptUrl || spreadsheetConfig.deploymentId || ''
    );
    let scriptError: string | undefined;
    let sheetError: string | undefined;

    if (target) {
      const fromSheet = await fetchFromGoogleSheetId(target.id, target.isPublished);
      if (fromSheet.topics && fromSheet.topics.length > 0) {
        rawFetchCache = {
          topics: fromSheet.topics,
          source: 'spreadsheet',
          lastSyncedAt: new Date().toISOString(),
          fetchedAtMs: now,
        };
        liveCache = buildLiveSnapshot(rawFetchCache);
        return liveCache;
      }
      sheetError = fromSheet.errorReason;
    }

    if (effectiveScriptUrl) {
      const ssIdForScript = target && !target.isPublished ? target.id : '';
      const fromGas = await fetchFromAppsScript(effectiveScriptUrl, ssIdForScript);
      if (fromGas.topics && fromGas.topics.length > 0) {
        rawFetchCache = {
          topics: fromGas.topics,
          source: 'apps_script',
          lastSyncedAt: new Date().toISOString(),
          fetchedAtMs: now,
        };
        liveCache = buildLiveSnapshot(rawFetchCache);
        return liveCache;
      }
      scriptError = fromGas.errorReason;
    }

    if (scriptError && !target) {
      warning = scriptError;
    } else if (sheetError) {
      warning = scriptError ? `${sheetError} (${scriptError})` : sheetError;
    } else if (scriptError) {
      warning = scriptError;
    } else if (target) {
      warning =
        'Gagal memindai tab soal dari Google Spreadsheet. Pastikan link dibagikan "Siapa saja dapat melihat" dan baris 1 berisi header yang sesuai.';
    } else {
      warning =
        'Link Google Spreadsheet belum diisi. Unduh template Excel (.xlsx) di Admin, unggah ke Google Sheets, lalu tempelkan link-nya di tab Bank Soal.';
    }
  } else {
    warning = 'Sinkronisasi spreadsheet sedang dinonaktifkan di Pengaturan Admin.';
  }

  rawFetchCache = {
    topics: [],
    source: 'unconfigured',
    warning,
    lastSyncedAt: new Date().toISOString(),
    fetchedAtMs: now,
  };
  liveCache = buildLiveSnapshot(rawFetchCache);
  return liveCache;
}
