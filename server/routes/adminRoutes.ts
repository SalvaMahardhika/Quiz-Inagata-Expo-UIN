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

adminRoutes.get('/records', requireAdminPin, (_req, res) => {
  res.json(getAllAdminRecords());
});

adminRoutes.delete('/records', requireAdminPin, (_req, res) => {
  clearAllLeaderboardRecords();
  res.json({ ok: true, totalCount: 0 });
});

adminRoutes.get('/tokens', requireAdminPin, (_req, res) => {
  res.json({ tokens: listTokens() });
});

adminRoutes.post('/tokens/generate', requireAdminPin, (req, res) => {
  const result = generateTokens({
    count: req.body?.count,
    mode: req.body?.mode,
    label: req.body?.label,
  });
  res.status(201).json({ ok: true, ...result });
});

adminRoutes.delete('/tokens/:code', requireAdminPin, (req, res) => {
  const tokens = deleteTokenByCode(String(req.params.code || ''));
  res.json({ ok: true, tokens });
});

adminRoutes.delete('/tokens', requireAdminPin, (req, res) => {
  const scope = String(req.query.scope || 'used');
  const tokens = clearTokensByScope(scope);
  res.json({ ok: true, tokens });
});

adminRoutes.get('/spreadsheet', requireAdminPin, async (_req, res) => {
  const live = await getLiveTopics(false);
  res.json({
    config: getSpreadsheetConfig(),
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
  const { config, connectionChanged } = updateSpreadsheetConfigState(req.body || {});
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

adminRoutes.get('/participant-sheet', requireAdminPin, (_req, res) => {
  res.json({ config: getParticipantSheetConfig() });
});

adminRoutes.put('/participant-sheet', requireAdminPin, (req, res) => {
  const config = updateParticipantSheetConfigState(req.body || {});
  res.json({ ok: true, config });
});

adminRoutes.post('/participant-sheet/test', requireAdminPin, async (_req, res) => {
  const result = await testParticipantSheetConnection();
  res.status(result.ok ? 200 : 400).json(result);
});
