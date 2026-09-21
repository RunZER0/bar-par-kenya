import { serve } from "@hono/node-server";
import { createApp } from "./src/app.js";
import { createAuth } from "./src/auth.js";
import { MemoryStore } from "./test/memory-store.js";

const app = createApp({
  store: new MemoryStore(),
  auth: createAuth("local-validation-secret-that-is-at-least-32-characters"),
  corsOrigins: ["http://localhost:3000"],
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Local validation server listening on http://localhost:${info.port}`);
});
