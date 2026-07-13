import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { randomUUID } from "node:crypto";
import { logger, type Logger } from "./logger";
import { createRateLimiter } from "./rate-limit";

type Handler = (
  req: EnhancedRequest,
  res: EnhancedResponse,
  next: () => void,
) => void | Promise<void>;

type ErrorHandler = (
  err: Error,
  req: EnhancedRequest,
  res: EnhancedResponse,
  next: () => void,
) => void;

interface ServerOptions {
  cors?: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  bodyParser?: {
    json?: { limit: string };
    urlencoded?: { limit: string };
  };
  trustProxy?: boolean;
  csp?: {
    directives?: Record<string, (string | string[])[]>;
  };
}

interface RouteLayer {
  method: string | null;
  path: string;
  handler: Handler | RouterInstance;
  isRouter: boolean;
}

interface RouterInstance {
  layers: RouteLayer[];
  use: (pathOrHandler: string | Handler | RouterInstance, handler?: Handler | RouterInstance) => void;
  get: (path: string, handler: Handler) => void;
  post: (path: string, handler: Handler) => void;
  patch: (path: string, handler: Handler) => void;
  delete: (path: string, handler: Handler) => void;
  handle: (req: EnhancedRequest, res: EnhancedResponse, done: () => void) => void;
}

interface FileDescriptor {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type EnhancedRequest = Omit<IncomingMessage, "log"> & {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: unknown;
  path: string;
  log: Logger;
  ip?: string;
  userId?: number;
  externalApiKey?: string;
  externalSourceIp?: string;
  file?: FileDescriptor;
};

type EnhancedResponse = ServerResponse & {
  json: (data: unknown) => void;
  status: (code: number) => EnhancedResponse;
  sendStatus: (code: number) => void;
  send: (body: unknown) => void;
  redirect: (url: string) => void;
};

function buildRes(res: ServerResponse): EnhancedResponse {
  const enhanced = res as EnhancedResponse;

  enhanced.status = function (code: number): EnhancedResponse {
    this.statusCode = code;
    return this;
  };

  enhanced.sendStatus = function (code: number): void {
    this.statusCode = code;
    this.end();
  };

  enhanced.send = function (body: unknown): void {
    if (typeof body === "string") {
      if (!this.getHeader("Content-Type")) {
        this.setHeader("Content-Type", "text/html; charset=utf-8");
      }
      this.end(body);
    } else if (Buffer.isBuffer(body)) {
      if (!this.getHeader("Content-Type")) {
        this.setHeader("Content-Type", "application/octet-stream");
      }
      this.end(body);
    } else {
      this.json(body);
    }
  };

  enhanced.json = function (data: unknown): void {
    const json = JSON.stringify(data);
    this.setHeader("Content-Type", "application/json; charset=utf-8");
    this.end(json);
  };

  enhanced.redirect = function (url: string): void {
    this.statusCode = 302;
    this.setHeader("Location", url);
    this.end();
  };

  return enhanced;
}

function requestLogger(req: IncomingMessage): Logger {
  const reqId = randomUUID().slice(0, 8);
  const baseCtx = { req: { id: reqId, method: req.method, url: req.url?.split("?")[0] } };
  return {
    info: (...args: unknown[]) => {
      const [obj, msg] = normalizeArgs(args);
      const ctx = obj && typeof obj === "object" ? { ...baseCtx, ...(obj as Record<string, unknown>) } : baseCtx;
      logger.info(ctx, msg);
    },
    warn: (...args: unknown[]) => {
      const [obj, msg] = normalizeArgs(args);
      const ctx = obj && typeof obj === "object" ? { ...baseCtx, ...(obj as Record<string, unknown>) } : baseCtx;
      logger.warn(ctx, msg);
    },
    error: (...args: unknown[]) => {
      const [obj, msg] = normalizeArgs(args);
      const ctx = obj && typeof obj === "object" ? { ...baseCtx, ...(obj as Record<string, unknown>) } : baseCtx;
      logger.error(ctx, msg);
    },
    debug: (...args: unknown[]) => {
      const [obj, msg] = normalizeArgs(args);
      const ctx = obj && typeof obj === "object" ? { ...baseCtx, ...(obj as Record<string, unknown>) } : baseCtx;
      logger.debug(ctx, msg);
    },
  };
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

function matchPath(
  pattern: string,
  pathname: string,
): { params: Record<string, string> } | null {
  if (pattern === pathname) return { params: {} };

  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i]!;
    const wp = pathParts[i]!;
    if (pp.startsWith(":")) {
      const paramName = pp.slice(1);
      params[paramName] = decodeURIComponent(wp);
    } else if (pp !== wp) {
      return null;
    }
  }

  return { params };
}

function pathStartsWith(full: string, prefix: string): boolean {
  if (prefix === "/" || prefix === "") return true;
  if (!full.startsWith(prefix)) return false;
  return full.length === prefix.length || full[prefix.length] === "/";
}

const routerProto: RouterInstance = {
  layers: [],

  use(
    this: RouterInstance,
    pathOrHandler: string | Handler | RouterInstance,
    handler?: Handler | RouterInstance,
  ): void {
    let path = "/";
    let fn: Handler | RouterInstance;

    if (handler) {
      path = pathOrHandler as string;
      fn = handler;
    } else {
      fn = pathOrHandler as Handler | RouterInstance;
    }

    const isRouter = typeof fn === "object" && fn !== null && "layers" in fn;

    if (typeof fn === "function" || isRouter) {
      this.layers.push({
        method: null,
        path: path.endsWith("/") ? path.slice(0, -1) || "/" : path,
        handler: fn,
        isRouter,
      });
    }
  },

  get(this: RouterInstance, path: string, handler: Handler): void {
    this.layers.push({ method: "GET", path, handler, isRouter: false });
  },

  post(this: RouterInstance, path: string, handler: Handler): void {
    this.layers.push({ method: "POST", path, handler, isRouter: false });
  },

  patch(this: RouterInstance, path: string, handler: Handler): void {
    this.layers.push({ method: "PATCH", path, handler, isRouter: false });
  },

  delete(this: RouterInstance, path: string, handler: Handler): void {
    this.layers.push({ method: "DELETE", path, handler, isRouter: false });
  },

  handle(
    this: RouterInstance,
    req: EnhancedRequest,
    res: EnhancedResponse,
    done: () => void,
  ): void {
    dispatchLayers(this.layers, 0, req, res, done);
  },
};

function dispatchLayers(
  layers: RouteLayer[],
  index: number,
  req: EnhancedRequest,
  res: EnhancedResponse,
  done: () => void,
): void {
  if (index >= layers.length) {
    done();
    return;
  }

  const layer = layers[index]!;
  const originalParams = { ...req.params };
  const originalPath = req.path;

  let matched = false;
  let routeParams: Record<string, string> | null = null;

  if (layer.method === null) {
    if (pathStartsWith(req.path, layer.path)) {
      if (layer.isRouter) {
        const prefix = layer.path;
        const subPath = prefix === "/"
          ? req.path
          : req.path.slice(prefix.length) || "/";
        req.path = subPath;
        matched = true;
      } else {
        matched = true;
      }
    }
  } else {
    if (req.method === layer.method) {
      const result = matchPath(layer.path, req.path);
      if (result) {
        routeParams = result.params;
        matched = true;
      }
    }
  }

  if (!matched) {
    dispatchLayers(layers, index + 1, req, res, done);
    return;
  }

  if (routeParams) {
    req.params = { ...req.params, ...routeParams };
  }

  const next = (err?: unknown) => {
    req.params = originalParams;
    req.path = originalPath;

    if (err) {
      const error = err && typeof err === "object" && "message" in err
        ? err as Error
        : new Error(String(err));
      callErrorHandler(error, layers, index + 1, req, res, done);
      return;
    }
    dispatchLayers(layers, index + 1, req, res, done);
  };

  if (layer.isRouter) {
    const subRouter = layer.handler as RouterInstance;
    subRouter.handle(req, res, () => {
      req.params = originalParams;
      req.path = originalPath;
      dispatchLayers(layers, index + 1, req, res, done);
    });
    return;
  }

  const handler = layer.handler as Handler;

  try {
    const result = handler(req, res, next);
    if (result instanceof Promise) {
      result.catch((caughtErr) => next(caughtErr));
    }
  } catch (err) {
    next(err);
  }
}

function callErrorHandler(
  err: Error,
  layers: RouteLayer[],
  startIndex: number,
  req: EnhancedRequest,
  res: EnhancedResponse,
  done: () => void,
): void {
  for (let i = startIndex; i < layers.length; i++) {
    const layer = layers[i]!;
    if (layer.method === null && !layer.isRouter) {
      const handler = layer.handler as Handler;
      if (handler.length >= 4) {
        const errorHandler = handler as unknown as ErrorHandler;
        try {
          const result = errorHandler(err, req, res, () => {
            callErrorHandler(err, layers, i + 1, req, res, done);
          });
          const resultAsAny = result as unknown;
          if (resultAsAny && typeof (resultAsAny as Promise<void>).then === "function") {
            (resultAsAny as Promise<void>).catch(() => { /* error handler error — ignore */ });
          }
          return;
        } catch (e) {
          err = e && typeof e === "object" && "message" in e
            ? e as Error
            : new Error(String(e));
          continue;
        }
      }
    }
  }
  done();
}

function parseBodySizeLimit(limit: string): number {
  const match = limit.match(/^(\d+)([kmg]?b?)$/i);
  if (!match) return 1_048_576;
  const num = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  if (unit.startsWith("g")) return num * 1073741824;
  if (unit.startsWith("m")) return num * 1048576;
  if (unit.startsWith("k")) return num * 1024;
  return num;
}

async function readBody(req: IncomingMessage, maxSize: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxSize) {
      throw new Error(`Request body too large (max ${maxSize} bytes)`);
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks);
}

async function parseJsonBody(
  req: IncomingMessage,
  res: ServerResponse,
  maxSize: number,
): Promise<void> {
  const raw = await readBody(req, maxSize);
  if (raw.length === 0) return;

  try {
    (req as unknown as EnhancedRequest).body = JSON.parse(raw.toString("utf8"));
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Invalid JSON in request body" }));
  }
}

async function parseUrlEncodedBody(
  req: IncomingMessage,
  res: ServerResponse,
  maxSize: number,
): Promise<void> {
  const raw = await readBody(req, maxSize);
  if (raw.length === 0) return;

  const text = raw.toString("utf8");
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  (req as unknown as EnhancedRequest).body = result;
}

const DEFAULT_CSP_DIRECTIVES: Record<string, (string | string[])[]> = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "font-src": ["'self'", "https:", "data:"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"],
  "img-src": ["'self'", "data:", "https:"],
  "object-src": ["'none'"],
  "script-src": ["'self'"],
  "script-src-attr": ["'none'"],
  "style-src": ["'self'", "https:", "'unsafe-inline'"],
  "upgrade-insecure-requests": [],
};

function buildCsp(directives: Record<string, (string | string[])[]>): string {
  const parts: string[] = [];
  for (const [key, values] of Object.entries(directives)) {
    if (values.length === 0) {
      parts.push(key);
    } else {
      parts.push(`${key} ${values.join(" ")}`);
    }
  }
  return parts.join("; ");
}

function applySecurityHeaders(res: ServerResponse, csp?: string): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (csp) {
    res.setHeader("Content-Security-Policy", csp);
  }
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
}

function handleCors(
  req: IncomingMessage,
  res: ServerResponse,
  options: NonNullable<ServerOptions["cors"]>,
): boolean {
  const origin = req.headers["origin"] as string | undefined;
  if (!origin) return false;

  const allowedOrigins = typeof options.origin === "string"
    ? options.origin === "*"
      ? "*"
      : options.origin
    : options.origin?.join(",") ?? "*";

  if (allowedOrigins === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    const origins = allowedOrigins.split(",").map((o) => o.trim());
    if (origins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
  }

  const methods = options.methods ?? ["GET", "POST", "PATCH", "DELETE"];
  res.setHeader("Access-Control-Allow-Methods", methods.join(", "));

  const allowedHeaders = options.allowedHeaders ?? ["Content-Type", "Authorization", "x-api-key"];
  res.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(", "));

  if (options.credentials) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}

function createServer(
  mainRouter: RouterInstance,
  options?: ServerOptions,
): http.Server {
  const opt: ServerOptions = {
    cors: options?.cors ?? {
      origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
      credentials: true,
    },
    rateLimit: options?.rateLimit ?? {
      windowMs: 60_000,
      max: parseInt(process.env.RATE_LIMIT_MAX ?? "200", 10),
    },
    bodyParser: options?.bodyParser ?? {
      json: { limit: "1mb" },
      urlencoded: { limit: "1mb" },
    },
    trustProxy: options?.trustProxy ?? true,
    csp: options?.csp ?? { directives: DEFAULT_CSP_DIRECTIVES },
  };

  const cspHeader = buildCsp(opt.csp?.directives ?? DEFAULT_CSP_DIRECTIVES);
  const rateLimiter = createRateLimiter(opt.rateLimit!);
  const jsonLimit = parseBodySizeLimit(opt.bodyParser?.json?.limit ?? "1mb");
  const urlencodedLimit = parseBodySizeLimit(opt.bodyParser?.urlencoded?.limit ?? "1mb");

  const jsonContentTypes = ["application/json", "application/json; charset=utf-8"];
  const urlencodedContentTypes = ["application/x-www-form-urlencoded"];

  const server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const parsedUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const pathname = parsedUrl.pathname;
      const queryObj: Record<string, string | string[]> = {};
      parsedUrl.searchParams.forEach((value, key) => {
        const existing = queryObj[key];
        if (existing === undefined) {
          queryObj[key] = value;
        } else if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          queryObj[key] = [existing, value];
        }
      });

      const eReq = req as unknown as EnhancedRequest;
      const eRes = buildRes(res);

      eReq.params = {};
      eReq.query = queryObj;
      eReq.body = null;
      eReq.path = pathname;

      if (opt.trustProxy) {
        const forwarded = req.headers["x-forwarded-for"];
        if (forwarded) {
          eReq.ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])?.trim()
            ?? req.socket.remoteAddress ?? "127.0.0.1";
        } else {
          eReq.ip = req.socket.remoteAddress ?? "127.0.0.1";
        }
      } else {
        eReq.ip = req.socket.remoteAddress ?? "127.0.0.1";
      }

      eReq.log = requestLogger(req);

      applySecurityHeaders(res, cspHeader);

      if (opt.cors) {
        const preflight = handleCors(req, res, opt.cors);
        if (preflight) return;
      }

      let rateLimited = false;
      rateLimiter(req, res, () => { rateLimited = true; });
      if (!rateLimited) return;

      const ct = (req.headers["content-type"] ?? "").toLowerCase().split(";")[0]?.trim() ?? "";
      const isJson = jsonContentTypes.some((jct) => ct === jct);
      const isUrlencoded = urlencodedContentTypes.some((uct) => ct === uct);

      if (isJson) {
        await parseJsonBody(req, res, jsonLimit);
        if (res.writableEnded) return;
      } else if (isUrlencoded) {
        await parseUrlEncodedBody(req, res, urlencodedLimit);
        if (res.writableEnded) return;
      } else if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        try {
          const bodyBuf = await readBody(req, jsonLimit);
          (eReq as unknown as Record<string, unknown>).body = bodyBuf;
        } catch (err: unknown) {
          const msg = err && typeof err === "object" && "message" in err
            ? (err as Error).message
            : "Request body too large";
          res.statusCode = 413;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: msg }));
          return;
        }
      }

      const start = Date.now();
      const origEnd = res.end.bind(res);
      res.end = function (this: ServerResponse, ...args: unknown[]) {
        const duration = Date.now() - start;
        eReq.log.info(
          { res: { statusCode: this.statusCode }, duration },
          `${req.method} ${pathname}`,
        );
        return (origEnd as (...a: unknown[]) => ReturnType<ServerResponse["end"]>)(...args);
      } as typeof res.end;

      let handled = false;
      mainRouter.handle(eReq, eRes, () => {
        if (!res.writableEnded) {
          if (!handled && pathname.startsWith("/api")) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Not found" }));
          }
        }
        handled = true;
      });
    },
  );

  return server;
}

export function Router(): RouterInstance {
  const router: RouterInstance = Object.create(routerProto);
  router.layers = [];
  return router;
}

export { createServer };
export type {
  EnhancedRequest,
  EnhancedResponse,
  Handler,
  ErrorHandler,
  RouterInstance,
  ServerOptions,
  FileDescriptor,
};
