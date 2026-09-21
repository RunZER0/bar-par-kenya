import { migrate } from "drizzle-orm/postgres-js/migrator";
import { loadConfig } from "../config.js";
import { createDatabase } from "./client.js";

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL, 1);

try {
  await migrate(database.db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations completed.");
} finally {
  await database.close();
}
