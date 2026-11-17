import { Router } from 'express';
import { sendParticipantLogToSheet } from '../services/participantSheetService.ts';

export const participantRoutes = Router();

participantRoutes.post('/log', async (req, res) => {
  const { timestamp, name, institution, phone, sessionType, score, topic } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ ok: false, error: 'Nama peserta wajib diisi.' });
    return;
  }

  const result = await sendParticipantLogToSheet({
    timestamp,
    name,
    institution: String(institution || '-'),
    phone: String(phone || '-'),
    sessionType: String(sessionType || 'Solo'),
    score: Number(score) || 0,
    topic: String(topic || '-'),
  });

  res.status(result.ok ? 200 : 502).json(result);
});
