import { readJsonFile, writeJsonFile, TOKENS_FILE } from '../lib/jsonStore.ts';
import { createRandomTokenCode } from '../lib/random.ts';
import type { SessionToken, TokenMode } from '../types.ts';

let tokenStore: SessionToken[] = readJsonFile<SessionToken[]>(TOKENS_FILE, []);

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
  requestedMode: 'SOLO' | 'MULTIPLAYER'
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

  if (found.mode !== 'ALL' && found.mode !== requestedMode) {
    const modeLabel = found.mode === 'SOLO' ? 'Mode Solo' : 'Mode Kelompok';
    return {
      ok: false,
      message: `Token ${code} hanya berlaku untuk ${modeLabel}.`,
    };
  }

  return { ok: true, token: found };
}

export function consumeSessionToken(
  rawCode: unknown,
  requestedMode: 'SOLO' | 'MULTIPLAYER',
  usedBy: string,
  usedInstitution: string,
  roomCode?: string
): { ok: true; token: SessionToken } | { ok: false; message: string } {
  const check = validateTokenAvailability(rawCode, requestedMode);
  if (!check.ok) return check;

  check.token.status = 'USED';
  check.token.usedAt = new Date().toISOString();
  check.token.usedBy = usedBy.trim() || 'Peserta';
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
