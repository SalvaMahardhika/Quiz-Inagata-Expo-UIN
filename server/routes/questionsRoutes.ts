import { Router } from 'express';
import { requireAdminPin } from '../services/authService.ts';
import { getLiveTopics } from '../services/spreadsheetService.ts';

export const questionsRoutes = Router();

questionsRoutes.get('/', async (req, res) => {
  const force = req.query.refresh === '1';
  const result = await getLiveTopics(force);
  res.json({
    topics: result.topics,
    source: result.source,
    lastSyncedAt: result.lastSyncedAt,
    sheetTopicsCount: result.sheetTopicsCount,
    totalLiveQuestions: result.totalLiveQuestions,
    warning: result.warning,
  });
});

questionsRoutes.post('/refresh', requireAdminPin, async (_req, res) => {
  const result = await getLiveTopics(true);
  res.json({
    topics: result.topics,
    source: result.source,
    lastSyncedAt: result.lastSyncedAt,
    sheetTopicsCount: result.sheetTopicsCount,
    totalLiveQuestions: result.totalLiveQuestions,
    warning: result.warning,
  });
});
