/**
 * ALIVE Connection — Backend API Server
 * Express.js + TypeScript
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import exchangeRouter from './routes/exchange';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:8081',     // Expo dev
    'http://localhost:5173',     // Vite dev
    'https://alive-connection.app',
  ],
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1', limiter);

// 라우트
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/exchanges', exchangeRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`[ALIVE Server] Running on http://localhost:${PORT}`);
  console.log(`[ALIVE Server] API: http://localhost:${PORT}/api/v1`);
});

export default app;
