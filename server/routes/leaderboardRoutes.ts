import { Router } from 'express';
import { addLeaderboardRecord, getPublicLeaderboard } from '../services/leaderboardService.ts';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/', async (req, res) => {
  const limitParam = Number(req.query.limit) || 20;
  const data = await getPublicLeaderboard(limitParam);
  res.json(data);
});

leaderboardRoutes.post('/', async (req, res) => {
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

  const record = await addLeaderboardRecord({
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
