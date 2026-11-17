import { Router } from 'express';
import { consumeSessionToken, validateTokenAvailability } from '../services/tokenService.ts';

export const tokenRoutes = Router();

tokenRoutes.post('/check', (req, res) => {
  const { token, mode } = req.body || {};
  const requestedMode: 'SOLO' | 'MULTIPLAYER' = mode === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'SOLO';
  const result = validateTokenAvailability(token, requestedMode);
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

tokenRoutes.post('/consume', (req, res) => {
  const { token, mode, name, institution } = req.body || {};
  const requestedMode: 'SOLO' | 'MULTIPLAYER' = mode === 'MULTIPLAYER' ? 'MULTIPLAYER' : 'SOLO';
  const result = consumeSessionToken(
    token,
    requestedMode,
    String(name || 'Peserta'),
    String(institution || '-')
  );
  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.message });
    return;
  }
  res.json({ ok: true, token: result.token });
});
