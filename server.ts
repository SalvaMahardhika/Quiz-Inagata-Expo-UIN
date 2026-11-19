import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { questionsRoutes } from './server/routes/questionsRoutes.ts';
import { leaderboardRoutes } from './server/routes/leaderboardRoutes.ts';
import { tokenRoutes } from './server/routes/tokenRoutes.ts';
import { adminRoutes } from './server/routes/adminRoutes.ts';
import { imageProxyRoutes } from './server/routes/imageProxyRoutes.ts';
import { participantRoutes } from './server/routes/participantRoutes.ts';
import { attachMultiplayerGateway } from './server/ws/multiplayerGateway.ts';
import { ensureLeaderboardLoaded } from './server/services/leaderboardService.ts';
import { ensureTokensLoaded } from './server/services/tokenService.ts';
import { ensureSpreadsheetConfigLoaded } from './server/services/spreadsheetService.ts';
import { ensureParticipantConfigLoaded } from './server/services/participantSheetService.ts';

export type {
  RoomPlayer,
  RoomQuestion,
  LeaderboardEntry,
  QuizRoom,
} from './server/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// API Routes (Level 1)
app.use('/api/questions', questionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/image-proxy', imageProxyRoutes);
app.use('/api/participants', participantRoutes);

// WebSocket Gateway (Level 1)
attachMultiplayerGateway(wss);

// Vite dev middleware / production static serving
async function setupApp() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    void Promise.all([
      ensureSpreadsheetConfigLoaded(),
      ensureParticipantConfigLoaded(),
      ensureTokensLoaded(),
      ensureLeaderboardLoaded(),
    ]).catch((err) => console.error('Firestore startup warmup warning:', err));
  });
}

setupApp();