import { Router, type EnhancedRequest } from "../lib/http-kit";
import { selectRaw } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { execSync } from "node:child_process";
import { createReadStream, unlinkSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const router = Router();

const MEDIA_DIR = process.env.MEDIA_DIR || "/app/media";
const BACKUP_DIR = "/tmp/omnichat-backups";

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
}

async function assertAdmin(req: EnhancedRequest, res: any): Promise<boolean> {
  const [viewer] = await selectRaw<{ role: string }>("SELECT role FROM users WHERE id = $1", [req.userId]);
  if (!viewer || viewer.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.get("/api/backup", requireAuth, async (req, res): Promise<void> => {
  if (!await assertAdmin(req, res)) return;
  ensureBackupDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dumpFile = join(BACKUP_DIR, `omnichat_${ts}.dump`);
  const archiveFile = join(BACKUP_DIR, `omnichat_${ts}.tar.gz`);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    res.status(500).json({ error: "DATABASE_URL not set" });
    return;
  }

  try {
    execSync(`pg_dump "${dbUrl}" --no-owner --no-acl -Fc -f "${dumpFile}"`, {
      stdio: "pipe",
      timeout: 300_000,
    });
    req.log.info({ dumpFile }, "Database dump created");

    const mediaFiles = existsSync(MEDIA_DIR) ? readdirSync(MEDIA_DIR).filter(f => f !== "." && f !== "..") : [];
    if (mediaFiles.length > 0) {
      execSync(`tar czf "${archiveFile}" -C "$(dirname "${dumpFile}")" "$(basename "${dumpFile}")" -C "${MEDIA_DIR}" .`, {
        stdio: "pipe",
        timeout: 300_000,
      });
    } else {
      execSync(`tar czf "${archiveFile}" -C "$(dirname "${dumpFile}")" "$(basename "${dumpFile}")"`, {
        stdio: "pipe",
        timeout: 300_000,
      });
    }

    try { unlinkSync(dumpFile); } catch {}

    if (!existsSync(archiveFile)) {
      res.status(500).json({ error: "Backup archive was not created" });
      return;
    }

    const stat = await import("node:fs/promises").then(m => m.stat(archiveFile));
    const fileSize = stat.size;

    req.log.info({ archiveFile, fileSize }, "Backup archive ready");

    res.writeHead(200, {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="omnichat_${ts}.tar.gz"`,
      "Content-Length": fileSize.toString(),
    });

    const stream = createReadStream(archiveFile);
    await new Promise<void>((resolve, reject) => {
      stream.pipe(res);
      stream.on("end", () => {
        try { unlinkSync(archiveFile); } catch {}
        resolve();
      });
      stream.on("error", (err) => {
        try { unlinkSync(archiveFile); } catch {}
        reject(err);
      });
    });
  } catch (err) {
    req.log.error({ err }, "Backup failed");
    try { unlinkSync(dumpFile); } catch {}
    try { unlinkSync(archiveFile); } catch {}
    if (!res.headersSent) {
      res.status(500).json({ error: "Backup failed" });
    }
  }
});

router.post("/api/restore", requireAuth, async (req, res): Promise<void> => {
  if (!await assertAdmin(req, res)) return;
  ensureBackupDir();

  const bodyBuf = (req as EnhancedRequest).body;
  if (!Buffer.isBuffer(bodyBuf) || bodyBuf.length === 0) {
    res.status(400).json({ error: "No backup data received. Send backup file as raw binary body (Content-Type: application/gzip)" });
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    res.status(500).json({ error: "DATABASE_URL not set" });
    return;
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const uploadPath = join(BACKUP_DIR, `restore_${ts}.tar.gz`);
  const restoreDir = join(BACKUP_DIR, `restore_${ts}`);

  try {
    writeFileSync(uploadPath, bodyBuf);

    mkdirSync(restoreDir, { recursive: true });
    execSync(`tar xzf "${uploadPath}" -C "${restoreDir}"`, { stdio: "pipe", timeout: 120_000 });

    const files = readdirSync(restoreDir);
    const dumpFile = files.find(f => f.endsWith(".dump"));
    if (!dumpFile) {
      res.status(400).json({ error: "No .dump file found in backup archive" });
      return;
    }

    const dumpPath = join(restoreDir, dumpFile);
    execSync(`pg_restore --clean --if-exists --no-owner --no-acl -d "${dbUrl}" "${dumpPath}"`, {
      stdio: "pipe",
      timeout: 300_000,
    });
    req.log.info("Database restore completed");

    const mediaRestoreDir = join(restoreDir, "media");
    if (existsSync(mediaRestoreDir)) {
      if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });
      execSync(`cp -r "${mediaRestoreDir}/." "${MEDIA_DIR}/"`, { stdio: "pipe", timeout: 120_000 });
      req.log.info("Media files restored");
    }

    res.json({ success: true, message: "Restore completed successfully" });
  } catch (err) {
    req.log.error({ err }, "Restore failed");
    res.status(500).json({ error: "Restore failed" });
  } finally {
    try { unlinkSync(uploadPath); } catch {}
    try { rmSync(restoreDir, { recursive: true, force: true } as any); } catch {}
  }
});

export default router;
