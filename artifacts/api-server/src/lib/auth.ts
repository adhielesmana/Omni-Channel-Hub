import { randomBytes, scryptSync, createHmac, timingSafeEqual } from "node:crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const JWT_SECRET = process.env.SESSION_SECRET ?? "omnichat-fallback-secret-do-not-use-in-prod";

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
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return Promise.resolve(`${salt}:${hash}`);
}

export function comparePassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return Promise.resolve(false);
  const computed = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  const buf1 = Buffer.from(hash, "hex");
  const buf2 = Buffer.from(computed, "hex");
  if (buf1.length !== buf2.length) return Promise.resolve(false);
  try {
    return Promise.resolve(timingSafeEqual(buf1, buf2));
  } catch {
    return Promise.resolve(false);
  }
}

export function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i]! % chars.length];
  }
  return password;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

function base64UrlEncodeBuffer(buf: Buffer): string {
  return buf.toString("base64url");
}

export function createToken(userId: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { userId, iat: now, exp: now + 86400 };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));

  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const signatureB64 = base64UrlEncodeBuffer(signature);

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(base64UrlDecode(headerB64!));
    if (!header || header.typ !== "JWT" || header.alg !== "HS256") return null;

    const signature = Buffer.from(signatureB64!, "base64url");
    const expectedSignature = createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest();

    if (!timingSafeEqual(signature, expectedSignature)) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64!));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return { userId: payload.userId as number };
  } catch {
    return null;
  }
}

export function invalidateToken(_token: string): void {
  // JWT is stateless — invalidation is handled client-side by clearing localStorage.
  // For production hardening, implement a token blocklist in the database.
}
