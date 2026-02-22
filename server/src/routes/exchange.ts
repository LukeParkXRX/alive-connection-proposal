/**
 * Exchange 라우터 — 핵심 교환 API
 * POST /exchanges: 교환 생성
 * GET /exchanges: 교환 목록
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// 교환 API Rate Limiting (분당 10회)
const exchangeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many exchange requests. Try again later.' },
});

// POST /exchanges — 교환 생성
router.post('/', authMiddleware, exchangeRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, method, location, cardId, eventName } = req.body;

    if (!partnerId || !method) {
      res.status(400).json({ error: 'partnerId and method are required' });
      return;
    }

    // TODO: DB에 교환 기록 생성 + 상대방 프로필 조회 + 중복 체크
    const exchangeId = `exch_${Date.now()}`;

    res.status(201).json({
      exchangeId,
      status: 'completed',
      partner: {
        userId: partnerId,
        displayName: 'Partner User',
      },
      context: {
        location: location || {},
        exchangedAt: new Date().toISOString(),
        method,
        eventName,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Exchange creation failed' });
  }
});

// GET /exchanges — 교환 목록
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: DB에서 교환 목록 조회 (pagination)
    res.json({
      exchanges: [],
      cursor: null,
      total: 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exchanges' });
  }
});

// GET /exchanges/:id — 교환 상세
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: DB에서 조회
    res.json({ exchangeId: id, message: 'Detail endpoint — connect to database' });
  } catch (err) {
    res.status(500).json({ error: 'Exchange not found' });
  }
});

// PUT /exchanges/:id/memo — 메모 추가/수정
router.put('/:id/memo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { memo } = req.body;
    // TODO: DB 업데이트
    res.json({ exchangeId: id, memo, updated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update memo' });
  }
});

export default router;
