/**
 * Profile 라우터 — 프로필 카드 CRUD
 * MVP: Supabase에 프록시 (추후 Prisma로 전환)
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /profile/me — 내 프로필
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Prisma로 DB 조회
    res.json({
      userId: req.userId,
      message: 'Profile endpoint — connect to database',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /profile/public/:slug — 공개 프로필 (ALIVE Link)
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    // TODO: alive.link/{slug} 프로필 조회
    res.json({
      slug,
      message: 'Public profile endpoint — connect to database',
    });
  } catch (err) {
    res.status(500).json({ error: 'Profile not found' });
  }
});

export default router;
