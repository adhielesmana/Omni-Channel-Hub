import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.SESSION_SECRET ?? "omnichat-fallback-secret-do-not-use-in-prod";
const JWT_EXPIRES_IN = "24h";

export const SUPERADMIN_ID = -1;
export const SUPERADMIN = {
  id: SUPERADMIN_ID,
  name: "Super Admin",
  email: "adhielesmana@kabeltelekom.id",
  role: "admin",
  isSuperadmin: true,
  isActive: true,
  departmentId: null,
  avatarUrl: "/omnichat-logo.svg",
  createdAt: new Date("2024-01-01"),
} as const;

export function isSuperadmin(userId: number): boolean {
  return userId === SUPERADMIN_ID;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  const bytes = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i]! % chars.length];
  }
  return password;
}

export function createToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function invalidateToken(_token: string): void {
  // JWT is stateless — invalidation is handled client-side by clearing localStorage.
  // For production hardening, implement a token blocklist in the database.
}
