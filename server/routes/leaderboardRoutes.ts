import { Router } from 'express';
import { addLeaderboardRecord, getPublicLeaderboard } from '../services/leaderboardService.ts';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/', (req, res) => {
  const limitParam = Number(req.query.limit) || 20;
  res.json(getPublicLeaderboard(limitParam));
});

leaderboardRoutes.post('/', (req, res) => {
  const {
    name,
    institution,
    phone,
    topicId,
    topicName,
    score,
    totalQuestions,
    correctCount,
    timedOutCount,
  } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Nama peserta wajib diisi.' });
    return;
  }

  const record = addLeaderboardRecord({
    name,
    institution,
    phone,
    topicId,
    topicName,
    score,
    totalQuestions,
    correctCount,
    timedOutCount,
  });

  res.status(201).json({ ok: true, record });
});
