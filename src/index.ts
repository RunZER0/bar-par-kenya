import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createAuth } from "./auth.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/client.js";
import { PostgresStore } from "./postgres-store.js";
import { createR2MediaStorage } from "./media-storage.js";

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL);
const mediaStorage = config.R2_ACCOUNT_ID
  && config.R2_ACCESS_KEY_ID
  && config.R2_SECRET_ACCESS_KEY
  && config.R2_BUCKET
  ? createR2MediaStorage({
      accountId: config.R2_ACCOUNT_ID,
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      bucket: config.R2_BUCKET,
    })
  : undefined;
const app = createApp({
  store: new PostgresStore(database.db),
  auth: createAuth(config.JWT_SECRET),
  corsOrigins: config.corsOrigins,
  ...(mediaStorage ? { mediaStorage } : {}),
  ...(config.ADMIN_API_KEY ? { adminApiKey: config.ADMIN_API_KEY } : {}),
});

const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`Bar Par Kenya API listening on http://localhost:${info.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await database.close();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
