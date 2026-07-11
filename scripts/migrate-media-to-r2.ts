import { promises as fs, readdirSync } from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MEDIA_DIR = path.resolve(process.env["MEDIA_DIR"] ?? "./media");

const ACCOUNT_ID = process.env["R2_ACCOUNT_ID"] ?? "";
const ACCESS_KEY_ID = process.env["R2_ACCESS_KEY_ID"] ?? "";
const SECRET_ACCESS_KEY = process.env["R2_SECRET_ACCESS_KEY"] ?? "";
const BUCKET = process.env["R2_BUCKET_NAME"] ?? "";
const ENDPOINT =
  process.env["R2_ENDPOINT"] ?? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const client = new S3Client({
  region: process.env["R2_REGION"] ?? "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  "3gp": "video/3gpp",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  amr: "audio/amr",
  aac: "audio/aac",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  bin: "application/octet-stream",
};

async function main() {
  let files: string[];
  try {
    files = readdirSync(MEDIA_DIR).filter((f) => f !== ".gitkeep");
  } catch {
    console.log("Media directory not found or empty. Nothing to migrate.");
    return;
  }

  console.log(`Found ${files.length} files to migrate from ${MEDIA_DIR}`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const filepath = path.join(MEDIA_DIR, file);
    try {
      const stat = await fs.stat(filepath);
      if (!stat.isFile()) continue;

      const ext = path.extname(file).slice(1).toLowerCase();
      const contentType = MIME_MAP[ext] ?? "application/octet-stream";

      const buffer = await fs.readFile(filepath);

      await client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: file,
          Body: buffer,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      console.log(`  ✓ ${file} (${(buffer.length / 1024).toFixed(1)} KB)`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${file}: ${err}`);
      failed++;
    }
  }

  console.log(`\nDone. ${success} uploaded, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
