/**
 * Auth 라우터 — MVP (Supabase 브릿지)
 * 추후 자체 JWT 인증으로 전환 시 확장
 */

import { Router, Request, Response } from 'express';
import { generateToken, generateRefreshToken } from '../middleware/auth';

const router = Router();

// POST /auth/login — MVP: 간단한 토큰 발급 (Supabase Auth와 병행)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, supabaseToken } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // MVP: Supabase token 검증 후 자체 JWT 발급
    // TODO: Supabase Admin SDK로 토큰 검증
    const userId = req.body.userId || 'temp-user-id';

    const token = generateToken(userId, email);
    const refreshToken = generateRefreshToken(userId, email);

    res.json({
      token,
      refreshToken,
      user: { id: userId, email },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // TODO: Verify refresh token and issue new tokens
    res.json({ message: 'Token refresh — not yet implemented' });
  } catch (err) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

export default router;
