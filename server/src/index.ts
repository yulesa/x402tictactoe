import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { gameRouter } from './routes/game.js';
import { cleanupExpiredSessions } from './services/sessionStore.js';
import { initX402, getPaymentRequirements } from './middleware/x402.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Payment requirements endpoint (client fetches this before making payment)
app.get('/api/payment-requirements', (_req, res) => {
  res.json(getPaymentRequirements());
});

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
