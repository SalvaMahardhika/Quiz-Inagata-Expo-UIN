import {
  fsDeleteDoc,
  fsListDocs,
  fsSetDoc,
  isFirestoreConfigured,
} from '../lib/firestoreStore.ts';
import { TOKENS_FILE, readJsonFile, writeJsonFile } from '../lib/jsonStore.ts';
import { createRandomTokenCode } from '../lib/random.ts';
import type { SessionToken, TokenMode } from '../types.ts';

const TOKENS_COLLECTION = 'tokens';

let tokenStore: SessionToken[] = readJsonFile<SessionToken[]>(TOKENS_FILE, []);
let loadPromise: Promise<void> | null = null;
let loadedFromFirestore = false;

interface TokenReservation {
  holderKey: string;
  mode: 'SOLO' | 'MULTIPLAYER';
  expiresAt: number;
}

const RESERVATION_TTL_MS = 20 * 60 * 1000;
const reservedTokens = new Map<string, TokenReservation>();

function toFirestoreTokenDoc(tok: SessionToken): Record<string, unknown> {
  const docData: Record<string, unknown> = {
    code: tok.code,
    mode: tok.mode,
    label: String(tok.label || '').slice(0, 120),
    status: tok.status,
    createdAt: tok.createdAt,
  };
  if (tok.usedAt) docData.usedAt = tok.usedAt;
  if (tok.usedBy) docData.usedBy = String(tok.usedBy).slice(0, 120);
  if (tok.usedInstitution) docData.usedInstitution = String(tok.usedInstitution).slice(0, 160);
  if (tok.usedMode) docData.usedMode = tok.usedMode;
  if (tok.roomCode) docData.roomCode = String(tok.roomCode).slice(0, 16);
  return docData;
}

export async function ensureTokensLoaded(): Promise<void> {
  if (loadedFromFirestore || !isFirestoreConfigured()) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const docs = await fsListDocs<SessionToken>(TOKENS_COLLECTION, 'tokens');
        if (docs.length > 0) {
          tokenStore = docs.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          writeJsonFile(TOKENS_FILE, tokenStore);
        } else if (tokenStore.length > 0) {
          await Promise.all(
            tokenStore.map((tok) =>
              fsSetDoc(TOKENS_COLLECTION, tok.code, toFirestoreTokenDoc(tok)).catch((err) =>
                console.error('Gagal seed token ke Firestore:', err)
              )
            )
          );
        }
        loadedFromFirestore = true;
      } catch (err) {
        console.error('Gagal memuat token dari Firestore:', err);
      } finally {
        loadPromise = null;
      }
    })();
  }
  await loadPromise;
}

function getActiveReservation(code: string): TokenReservation | null {
  const entry = reservedTokens.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    reservedTokens.delete(code);
    return null;
  }
  return entry;
}

export function normalizeTokenCode(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function listTokens(): SessionToken[] {
  return tokenStore;
}

export function validateTokenAvailability(
  rawCode: unknown,
  requestedMode: 'SOLO' | 'MULTIPLAYER',
  holderKey?: string
): { ok: true; token: SessionToken } | { ok: false; message: string } {
  const code = normalizeTokenCode(rawCode);
  if (!code) {
    return { ok: false, message: 'Token sesi wajib diisi. Minta token dari Admin.' };
  }

  const found = tokenStore.find((t) => t.code === code);
  if (!found) {
    return { ok: false, message: 'Token sesi tidak valid atau tidak ditemukan.' };
  }

  if (found.status === 'USED') {
    return {
      ok: false,
      message: `Token ${code} sudah pernah digunakan dan hanya berlaku untuk 1 sesi.`,
    };
  }

  const activeRes = getActiveReservation(code);
  if (activeRes && (!holderKey || activeRes.holderKey !== holderKey)) {
    return {
      ok: false,
      message: `Token ${code} sedang aktif digunakan di sesi lain.`,
    };
  }

  if (found.mode !== 'ALL' && found.mode !== requestedMode) {
    const modeLabel = found.mode === 'SOLO' ? 'Mode Solo' : 'Mode Kelompok';
    return {
      ok: false,
      message: `Token ${code} hanya berlaku untuk ${modeLabel}.`,
    };
  }

  return { ok: true, token: found };
}

export function reserveSessionToken(
  rawCode: unknown,
  requestedMode: 'SOLO' | 'MULTIPLAYER',
  holderKey: string
): { ok: true; token: SessionToken } | { ok: false; message: string } {
  const code = normalizeTokenCode(rawCode);
  const check = validateTokenAvailability(code, requestedMode, holderKey);
  if (!check.ok) return check;

  reservedTokens.set(code, {
    holderKey,
    mode: requestedMode,
    expiresAt: Date.now() + RESERVATION_TTL_MS,
  });
  return { ok: true, token: check.token };
}

export function releaseSessionTokenReservation(rawCode: unknown, holderKey?: string): void {
  const code = normalizeTokenCode(rawCode);
  if (!code) return;
  const active = reservedTokens.get(code);
  if (!active) return;
  if (!holderKey || active.holderKey === holderKey) {
    reservedTokens.delete(code);
  }
}

function applyConsumeTokenLocally(
  rawCode: unknown,
  requestedMode: 'SOLO' | 'MULTIPLAYER',
  usedBy: string,
  usedInstitution: string,
  roomCode?: string,
  holderKey?: string
): { ok: true; token: SessionToken; changed: boolean } | { ok: false; message: string } {
  const code = normalizeTokenCode(rawCode);
  const existing = tokenStore.find((t) => t.code === code);
  const cleanUser = usedBy.trim().slice(0, 120) || 'Peserta';

  // Idempotent: jika token sudah ditandai terpakai oleh sesi yang sama, tetap sukses
  if (
    existing &&
    existing.status === 'USED' &&
    existing.usedMode === requestedMode &&
    ((roomCode && existing.roomCode === roomCode) ||
      (!roomCode && (existing.usedBy || '') === cleanUser))
  ) {
    reservedTokens.delete(code);
    return { ok: true, token: existing, changed: false };
  }

  const check = validateTokenAvailability(code, requestedMode, holderKey);
  if (!check.ok) return check;

  reservedTokens.delete(code);
  check.token.status = 'USED';
  check.token.usedAt = new Date().toISOString();
  check.token.usedBy = cleanUser;
  check.token.usedInstitution = usedInstitution.trim().slice(0, 160) || '-';
  check.token.usedMode = requestedMode;
  if (roomCode) {
    check.token.roomCode = roomCode.slice(0, 16);
  }

  writeJsonFile(TOKENS_FILE, tokenStore);
  return { ok: true, token: check.token, changed: true };
}

export function consumeSessionToken(
  rawCode: unknown,
  requestedMode: 'SOLO' | 'MULTIPLAYER',
  usedBy: string,
  usedInstitution: string,
  roomCode?: string,
  holderKey?: string
): { ok: true; token: SessionToken } | { ok: false; message: string } {
  const res = applyConsumeTokenLocally(
    rawCode,
    requestedMode,
    usedBy,
    usedInstitution,
    roomCode,
    holderKey
  );
  if (!res.ok) return res;
  if (res.changed && isFirestoreConfigured()) {
    void fsSetDoc(TOKENS_COLLECTION, res.token.code, toFirestoreTokenDoc(res.token)).catch(
      (err) => console.error('Gagal menyimpan status token ke Firestore:', err)
    );
  }
  return { ok: true, token: res.token };
}

export async function consumeSessionTokenAsync(
  rawCode: unknown,
  requestedMode: 'SOLO' | 'MULTIPLAYER',
  usedBy: string,
  usedInstitution: string,
  roomCode?: string,
  holderKey?: string
): Promise<{ ok: true; token: SessionToken } | { ok: false; message: string }> {
  await ensureTokensLoaded();
  const res = applyConsumeTokenLocally(
    rawCode,
    requestedMode,
    usedBy,
    usedInstitution,
    roomCode,
    holderKey
  );
  if (!res.ok) return res;
  if (res.changed && isFirestoreConfigured()) {
    try {
      await fsSetDoc(TOKENS_COLLECTION, res.token.code, toFirestoreTokenDoc(res.token));
    } catch (err) {
      console.error('Gagal commit token terpakai ke Firestore:', err);
    }
  }
  return { ok: true, token: res.token };
}

export async function generateTokens(params: {
  count?: number;
  mode?: string;
  label?: string;
}): Promise<{ created: SessionToken[]; tokens: SessionToken[] }> {
  await ensureTokensLoaded();
  const count = Math.max(1, Math.min(50, Number(params.count) || 1));
  const modeRaw = String(params.mode || 'ALL').toUpperCase();
  const mode: TokenMode =
    modeRaw === 'SOLO' || modeRaw === 'MULTIPLAYER' ? modeRaw : 'ALL';
  const label = String(params.label || '').trim().slice(0, 120);

  const existingCodes = new Set(tokenStore.map((t) => t.code));
  const created: SessionToken[] = [];
  const nowIso = new Date().toISOString();

  for (let i = 0; i < count; i++) {
    let code = '';
    do {
      code = createRandomTokenCode(6);
    } while (existingCodes.has(code));
    existingCodes.add(code);

    created.push({
      code,
      mode,
      label,
      status: 'UNUSED',
      createdAt: nowIso,
    });
  }

  tokenStore = [...created, ...tokenStore];
  writeJsonFile(TOKENS_FILE, tokenStore);

  if (isFirestoreConfigured()) {
    await Promise.all(
      created.map((tok) =>
        fsSetDoc(TOKENS_COLLECTION, tok.code, toFirestoreTokenDoc(tok)).catch((err) =>
          console.error('Gagal menyimpan token baru ke Firestore:', err)
        )
      )
    );
  }

  return { created, tokens: tokenStore };
}

export async function deleteTokenByCode(rawCode: string): Promise<SessionToken[]> {
  await ensureTokensLoaded();
  const target = normalizeTokenCode(rawCode);
  tokenStore = tokenStore.filter((t) => t.code !== target);
  writeJsonFile(TOKENS_FILE, tokenStore);

  if (isFirestoreConfigured() && target) {
    try {
      await fsDeleteDoc(TOKENS_COLLECTION, target);
    } catch (err) {
      console.error('Gagal menghapus token di Firestore:', err);
    }
  }

  return tokenStore;
}

export async function clearTokensByScope(scope: string): Promise<SessionToken[]> {
  await ensureTokensLoaded();
  const toDelete =
    scope === 'all' ? [...tokenStore] : tokenStore.filter((t) => t.status === 'USED');

  if (scope === 'all') {
    tokenStore = [];
  } else {
    tokenStore = tokenStore.filter((t) => t.status !== 'USED');
  }
  writeJsonFile(TOKENS_FILE, tokenStore);

  if (isFirestoreConfigured() && toDelete.length > 0) {
    await Promise.all(
      toDelete.map((t) =>
        fsDeleteDoc(TOKENS_COLLECTION, t.code).catch((err) =>
          console.error('Gagal menghapus token di Firestore:', err)
        )
      )
    );
  }

  return tokenStore;
}
