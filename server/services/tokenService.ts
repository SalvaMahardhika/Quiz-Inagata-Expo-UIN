import { readJsonFile, writeJsonFile, TOKENS_FILE } from '../lib/jsonStore.ts';
import { createRandomTokenCode } from '../lib/random.ts';
import type { SessionToken, TokenMode } from '../types.ts';

let tokenStore: SessionToken[] = readJsonFile<SessionToken[]>(TOKENS_FILE, []);

interface TokenReservation {
  holderKey: string;
  mode: 'SOLO' | 'MULTIPLAYER';
  expiresAt: number;
}

const RESERVATION_TTL_MS = 20 * 60 * 1000;
const reservedTokens = new Map<string, TokenReservation>();

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

export function consumeSessionToken(
  rawCode: unknown,
  requestedMode: 'SOLO' | 'MULTIPLAYER',
  usedBy: string,
  usedInstitution: string,
  roomCode?: string,
  holderKey?: string
): { ok: true; token: SessionToken } | { ok: false; message: string } {
  const code = normalizeTokenCode(rawCode);
  const existing = tokenStore.find((t) => t.code === code);
  const cleanUser = usedBy.trim() || 'Peserta';

  // Idempotent: jika token sudah ditandai terpakai oleh sesi yang sama, tetap sukses
  if (
    existing &&
    existing.status === 'USED' &&
    existing.usedMode === requestedMode &&
    ((roomCode && existing.roomCode === roomCode) ||
      (!roomCode && (existing.usedBy || '') === cleanUser))
  ) {
    reservedTokens.delete(code);
    return { ok: true, token: existing };
  }

  const check = validateTokenAvailability(code, requestedMode, holderKey);
  if (!check.ok) return check;

  reservedTokens.delete(code);
  check.token.status = 'USED';
  check.token.usedAt = new Date().toISOString();
  check.token.usedBy = cleanUser;
  check.token.usedInstitution = usedInstitution.trim() || '-';
  check.token.usedMode = requestedMode;
  if (roomCode) {
    check.token.roomCode = roomCode;
  }

  writeJsonFile(TOKENS_FILE, tokenStore);
  return { ok: true, token: check.token };
}

export function generateTokens(params: {
  count?: number;
  mode?: string;
  label?: string;
}): { created: SessionToken[]; tokens: SessionToken[] } {
  const count = Math.max(1, Math.min(50, Number(params.count) || 1));
  const modeRaw = String(params.mode || 'ALL').toUpperCase();
  const mode: TokenMode =
    modeRaw === 'SOLO' || modeRaw === 'MULTIPLAYER' ? modeRaw : 'ALL';
  const label = String(params.label || '').trim();

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

  return { created, tokens: tokenStore };
}

export function deleteTokenByCode(rawCode: string): SessionToken[] {
  const target = normalizeTokenCode(rawCode);
  tokenStore = tokenStore.filter((t) => t.code !== target);
  writeJsonFile(TOKENS_FILE, tokenStore);
  return tokenStore;
}

export function clearTokensByScope(scope: string): SessionToken[] {
  if (scope === 'all') {
    tokenStore = [];
  } else {
    tokenStore = tokenStore.filter((t) => t.status !== 'USED');
  }
  writeJsonFile(TOKENS_FILE, tokenStore);
  return tokenStore;
}
