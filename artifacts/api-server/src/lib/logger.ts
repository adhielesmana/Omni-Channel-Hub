const isProduction = process.env.NODE_ENV === "production";

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LOG_LEVELS;

const currentLevel: Level = (process.env.LOG_LEVEL as Level) ?? "info";

function shouldLog(level: Level): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    const obj: Record<string, unknown> = { message: err.message, name: err.name, stack: err.stack };
    const cause = (err as any).cause;
    if (cause) obj.cause = serializeError(cause);
    return obj;
  }
  return err;
}

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const REDACTED = "[REDACTED]";
  const redactPaths = [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers.set-cookie",
  ];

  const redacted = { ...obj };
  for (const path of redactPaths) {
    const parts = path.split(".");
    let current: any = redacted;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current && typeof current === "object" && parts[i]! in current) {
        current = current[parts[i]!];
      } else {
        current = undefined;
        break;
      }
    }
    if (current && typeof current === "object" && parts[parts.length - 1]! in current) {
      current[parts[parts.length - 1]!] = REDACTED;
    }
  }
  return redacted;
}

function stringify(obj: unknown, message: string): string {
  const timestamp = formatTimestamp();
  if (isProduction) {
    const base: Record<string, unknown> = { timestamp, level: "info", msg: message };
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const sanitized = sanitize(obj as Record<string, unknown>);
      for (const [k, v] of Object.entries(sanitized)) {
        if (v instanceof Error) base[k] = serializeError(v);
        else base[k] = v;
      }
    } else if (obj instanceof Error) {
      base.err = serializeError(obj);
    }
    return JSON.stringify(base);
  }

  let prefix = timestamp;
  if (obj && typeof obj === "object") {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      let val = v;
      if (v instanceof Error) val = serializeError(v);
      else if (typeof v === "object") val = JSON.stringify(v);
      parts.push(`${k}=${String(val)}`);
    }
    if (parts.length) prefix += ` [${parts.join(", ")}]`;
  } else if (obj instanceof Error) {
    prefix += ` [${obj.message}]`;
  }
  return `${prefix} ${message}`;
}

function emit(level: Level, obj: unknown, message: string): void {
  if (!shouldLog(level)) return;
  const line = stringify(obj, message) + "\n";
  if (level === "error") {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

function normalizeArgs(args: unknown[]): [unknown, string] {
  if (args.length === 0) return [null, ""];
  if (args.length === 1) {
    const a = args[0];
    if (typeof a === "string") return [null, a];
    return [a, ""];
  }
  const obj = args[0];
  const msg = typeof args[1] === "string" ? args[1] : String(args[1] ?? "");
  return [obj, msg];
}

export const logger = {
  info(...args: unknown[]): void {
    const [obj, msg] = normalizeArgs(args);
    emit("info", obj, msg);
  },
  warn(...args: unknown[]): void {
    const [obj, msg] = normalizeArgs(args);
    emit("warn", obj, msg);
  },
  error(...args: unknown[]): void {
    const [obj, msg] = normalizeArgs(args);
    emit("error", obj, msg);
  },
  debug(...args: unknown[]): void {
    const [obj, msg] = normalizeArgs(args);
    emit("debug", obj, msg);
  },
};

export type Logger = typeof logger;
