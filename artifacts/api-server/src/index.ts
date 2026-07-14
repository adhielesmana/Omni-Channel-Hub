import server from "./app";
import { logger } from "./lib/logger";
import { startBlastWorker } from "./lib/blast-worker";
import { startTemplateSyncWorker } from "./lib/template-sync-worker";
import { startAiAgentWorker } from "./lib/ai-agent-worker";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

server.listen(port, () => {
  logger.info({ port }, "Server listening");
  startBlastWorker();
  startTemplateSyncWorker();
  startAiAgentWorker();
});
