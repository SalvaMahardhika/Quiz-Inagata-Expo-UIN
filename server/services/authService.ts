import type { Request, Response, NextFunction } from 'express';
import { ADMIN_PIN } from '../../src/types/quiz.ts';

export function getEffectiveAdminPin(): string {
  return process.env.ADMIN_PIN || ADMIN_PIN || '1234';
}

export function isValidAdminPin(pin: unknown): boolean {
  return typeof pin === 'string' && pin.trim() === getEffectiveAdminPin();
}

export function requireAdminPin(req: Request, res: Response, next: NextFunction): void {
  const pin = req.headers['x-admin-pin'] || req.body?.pin;
  if (!isValidAdminPin(pin)) {
    res.status(401).json({ error: 'PIN Admin tidak valid.' });
    return;
  }
  next();
}
