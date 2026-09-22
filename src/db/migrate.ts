import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./client.js";
import { databaseUrl } from "./database-url.js";

const database = createDatabase(databaseUrl(), 1);

try {
  await migrate(database.db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations completed.");
} finally {
  await database.close();
}
