import { Router } from 'express';
import {
  consumeSessionToken,
  releaseSessionTokenReservation,
  reserveSessionToken,
  validateTokenAvailability,
} from '../services/tokenService.ts';

export const tokenRoutes = Router();

tokenRoutes.post('/check', (req, res) => {
  const { token, mode, holderKey } = req.body || {};
  const requestedMode: 'SOLO' | 'MULTIPLAYER' = mode === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'SOLO';
  const result = validateTokenAvailability(
    token,
    requestedMode,
    holderKey ? String(holderKey) : undefined
  );
  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.message });
    return;
  }
  res.json({
    ok: true,
    token: {
      code: result.token.code,
      mode: result.token.mode,
      label: result.token.label,
    },
  });
});

tokenRoutes.post('/reserve', (req, res) => {
  const { token, mode, holderKey } = req.body || {};
  const requestedMode: 'SOLO' | 'MULTIPLAYER' = mode === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'SOLO';
  const result = reserveSessionToken(
    token,
    requestedMode,
    String(holderKey || `SOLO_${Date.now()}`)
  );
  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.message });
    return;
  }
  res.json({ ok: true, token: result.token });
});

tokenRoutes.post('/release', (req, res) => {
  const { token, holderKey } = req.body || {};
  releaseSessionTokenReservation(token, holderKey ? String(holderKey) : undefined);
  res.json({ ok: true });
});

tokenRoutes.post('/consume', (req, res) => {
  const { token, mode, name, institution, holderKey } = req.body || {};
  const requestedMode: 'SOLO' | 'MULTIPLAYER' = mode === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'SOLO';
  const result = consumeSessionToken(
    token,
    requestedMode,
    String(name || 'Peserta'),
    String(institution || '-'),
    undefined,
    holderKey ? String(holderKey) : undefined
  );
  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.message });
    return;
  }
  res.json({ ok: true, token: result.token });
});
