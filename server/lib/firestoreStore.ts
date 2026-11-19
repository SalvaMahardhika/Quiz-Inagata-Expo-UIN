import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEffectiveAdminPin } from '../services/authService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'firebase-applet-config.json');

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as FirebaseAppletConfig;
    if (
      !raw?.projectId ||
      !raw?.apiKey ||
      raw.projectId === 'remixed-project-id' ||
      raw.firestoreDatabaseId === 'remixed-firestore-database-id'
    ) {
      return null;
    }
    return raw;
  } catch (err) {
    console.error('Gagal membaca firebase-applet-config.json:', err);
    return null;
  }
}

const fbConfig = loadFirebaseConfig();

export function isFirestoreConfigured(): boolean {
  return Boolean(fbConfig?.projectId && fbConfig?.apiKey);
}

function getDocumentsBaseUrl(): string {
  if (!fbConfig) return '';
  const dbId =
    fbConfig.firestoreDatabaseId && fbConfig.firestoreDatabaseId !== '(default)'
      ? fbConfig.firestoreDatabaseId
      : '(default)';
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    fbConfig.projectId
  )}/databases/${encodeURIComponent(dbId)}/documents`;
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(val as Record<string, unknown>),
      },
    };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

function fromFirestoreValue(val: FirestoreValue | undefined): unknown {
  if (!val) return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map((item) => fromFirestoreValue(item));
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue.fields || {});
  }
  return undefined;
}

function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

export async function fsGetDoc<T>(collection: string, docId: string): Promise<T | null> {
  if (!fbConfig) return null;
  const url = `${getDocumentsBaseUrl()}/${encodeURIComponent(collection)}/${encodeURIComponent(
    docId
  )}?key=${encodeURIComponent(fbConfig.apiKey)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore GET ${collection}/${docId} gagal (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  if (!json.fields) return null;
  return fromFirestoreFields(json.fields) as T;
}

export async function fsListDocs<T>(
  collection: string,
  filterType: 'tokens' | 'leaderboard' = 'leaderboard'
): Promise<T[]> {
  if (!fbConfig) return [];
  const results: T[] = [];
  const url = `${getDocumentsBaseUrl()}:runQuery?key=${encodeURIComponent(fbConfig.apiKey)}`;
  const where =
    filterType === 'tokens'
      ? {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'IN',
            value: {
              arrayValue: {
                values: [{ stringValue: 'UNUSED' }, { stringValue: 'USED' }],
              },
            },
          },
        }
      : {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'topicId' },
                  op: 'GREATER_THAN_OR_EQUAL',
                  value: { integerValue: '0' },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'topicId' },
                  op: 'LESS_THAN_OR_EQUAL',
                  value: { integerValue: '1000' },
                },
              },
            ],
          },
        };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where,
        limit: 1000,
      },
    }),
  });
  if (res.status === 404) return results;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore LIST ${collection} gagal (${res.status}): ${errText}`);
  }
  const rows = (await res.json()) as Array<{
    document?: { fields?: Record<string, FirestoreValue> };
  }>;
  for (const row of rows || []) {
    if (row.document?.fields) {
      results.push(fromFirestoreFields(row.document.fields) as T);
    }
  }
  return results;
}

export async function fsSetDoc(
  collection: string,
  docId: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!fbConfig) return;
  const url = `${getDocumentsBaseUrl()}/${encodeURIComponent(collection)}/${encodeURIComponent(
    docId
  )}?key=${encodeURIComponent(fbConfig.apiKey)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore SET ${collection}/${docId} gagal (${res.status}): ${errText}`);
  }
}

export async function fsDeleteDoc(collection: string, docId: string): Promise<void> {
  if (!fbConfig) return;
  const url = `${getDocumentsBaseUrl()}/${encodeURIComponent(collection)}/${encodeURIComponent(
    docId
  )}?key=${encodeURIComponent(fbConfig.apiKey)}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (res.status === 404) return;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore DELETE ${collection}/${docId} gagal (${res.status}): ${errText}`);
  }
}

function derivePiiKey(): Buffer {
  const seed = `quiz-inagata-pii:${fbConfig?.projectId || 'local'}:${getEffectiveAdminPin()}`;
  return crypto.createHash('sha256').update(seed).digest();
}

export function encryptPhoneForStorage(phone: string): string {
  const clean = String(phone || '').trim();
  if (!clean || clean === '-') return '';
  try {
    const key = derivePiiKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(clean, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  } catch {
    return '';
  }
}

export function decryptPhoneFromStorage(phoneCipher: string | undefined): string {
  const raw = String(phoneCipher || '').trim();
  if (!raw) return '-';
  try {
    const [ivB64, tagB64, dataB64] = raw.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return '-';
    const key = derivePiiKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8') || '-';
  } catch {
    return '-';
  }
}
