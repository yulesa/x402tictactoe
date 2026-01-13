import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { gameRouter } from './routes/game.js';
import { cleanupExpiredSessions } from './services/sessionStore.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/session', sessionRouter);
app.use('/api/game', gameRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Cleanup expired sessions every minute
setInterval(cleanupExpiredSessions, 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
