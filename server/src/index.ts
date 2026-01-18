import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { gameRouter } from './routes/game.js';
import { cleanupExpiredSessions } from './services/sessionStore.js';
import { initX402 } from './middleware/x402.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://yulesa.github.io',
  ],
  credentials: true,
  exposedHeaders: ['X-Payment-Required', 'Payment-Required'],
}));
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

// Initialize x402 and start server
async function start() {
  try {
    await initX402();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize x402:', err);
    process.exit(1);
  }
}

start();
