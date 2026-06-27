import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const SALT_ROUNDS = 10;
const TOKEN_BYTES = 32;
const ACTIVE_TOKENS = new Map<string, { userId: number; expiresAt: number }>();

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i]! % chars.length];
  }
  return password;
}

export function createToken(userId: number): string {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  ACTIVE_TOKENS.set(token, {
    userId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  return token;
}

export function verifyToken(token: string): { userId: number } | null {
  const entry = ACTIVE_TOKENS.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ACTIVE_TOKENS.delete(token);
    return null;
  }
  return { userId: entry.userId };
}

export function invalidateToken(token: string): void {
  ACTIVE_TOKENS.delete(token);
}
