import { Router } from 'express';
import { isValidAdminPin, requireAdminPin } from '../services/authService.ts';
import {
  clearAllLeaderboardRecords,
  getAllAdminRecords,
} from '../services/leaderboardService.ts';
import {
  getLiveTopics,
  getSpreadsheetConfig,
  updateSpreadsheetConfigState,
} from '../services/spreadsheetService.ts';
import {
  clearTokensByScope,
  deleteTokenByCode,
  ensureTokensLoaded,
  generateTokens,
  listTokens,
} from '../services/tokenService.ts';
import {
  getParticipantSheetConfig,
  testParticipantSheetConnection,
  updateParticipantSheetConfigState,
} from '../services/participantSheetService.ts';

export const adminRoutes = Router();

adminRoutes.post('/verify', (req, res) => {
  const { pin } = req.body || {};
  if (!isValidAdminPin(pin)) {
    res.status(401).json({ ok: false, error: 'PIN Admin tidak sesuai.' });
    return;
  }
  res.json({ ok: true });
});

adminRoutes.get('/records', requireAdminPin, async (_req, res) => {
  res.json(await getAllAdminRecords());
});

adminRoutes.delete('/records', requireAdminPin, async (_req, res) => {
  await clearAllLeaderboardRecords();
  res.json({ ok: true, totalCount: 0 });
});

adminRoutes.get('/tokens', requireAdminPin, async (_req, res) => {
  await ensureTokensLoaded();
  res.json({ tokens: listTokens() });
});

adminRoutes.post('/tokens/generate', requireAdminPin, async (req, res) => {
  const result = await generateTokens({
    count: req.body?.count,
    mode: req.body?.mode,
    label: req.body?.label,
  });
  res.status(201).json({ ok: true, ...result });
});

adminRoutes.delete('/tokens/:code', requireAdminPin, async (req, res) => {
  const tokens = await deleteTokenByCode(String(req.params.code || ''));
  res.json({ ok: true, tokens });
});

adminRoutes.delete('/tokens', requireAdminPin, async (req, res) => {
  const scope = String(req.query.scope || 'used');
  const tokens = await clearTokensByScope(scope);
  res.json({ ok: true, tokens });
});

adminRoutes.get('/spreadsheet', requireAdminPin, async (_req, res) => {
  const config = await getSpreadsheetConfig();
  const live = await getLiveTopics(false);
  res.json({
    config,
    adminTopics: live.adminTopics,
    liveTopics: {
      topics: live.topics,
      source: live.source,
      lastSyncedAt: live.lastSyncedAt,
      sheetTopicsCount: live.sheetTopicsCount,
      totalLiveQuestions: live.totalLiveQuestions,
      warning: live.warning,
    },
  });
});

adminRoutes.put('/spreadsheet', requireAdminPin, async (req, res) => {
  const { config, connectionChanged } = await updateSpreadsheetConfigState(req.body || {});
  const live = await getLiveTopics(connectionChanged);
  res.json({
    ok: true,
    config,
    adminTopics: live.adminTopics,
    liveTopics: {
      topics: live.topics,
      source: live.source,
      lastSyncedAt: live.lastSyncedAt,
      sheetTopicsCount: live.sheetTopicsCount,
      totalLiveQuestions: live.totalLiveQuestions,
      warning: live.warning,
    },
    syncResult: {
      source: live.source,
      lastSyncedAt: live.lastSyncedAt,
      sheetTopicsCount: live.sheetTopicsCount,
      totalLiveQuestions: live.totalLiveQuestions,
      warning: live.warning,
    },
  });
});

adminRoutes.get('/participant-sheet', requireAdminPin, async (_req, res) => {
  res.json({ config: await getParticipantSheetConfig() });
});

adminRoutes.put('/participant-sheet', requireAdminPin, async (req, res) => {
  const config = await updateParticipantSheetConfigState(req.body || {});
  res.json({ ok: true, config });
});

adminRoutes.post('/participant-sheet/test', requireAdminPin, async (_req, res) => {
  const result = await testParticipantSheetConnection();
  res.status(result.ok ? 200 : 400).json(result);
});
