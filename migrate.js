// migrate.js — run on container start; idempotent if `users` already exists.
import fs from "fs";
import path from "path";
import pkg from "pg";
import { fileURLToPath } from "url";

const { Client } = pkg;

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  connectionString: dbUrl,
});

async function schemaPresent() {
  const r = await client.query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1`,
  );
  return r.rows.length > 0;
}

async function runMigration() {
  await client.connect();
  console.log("Connected to PostgreSQL database");

  if (await schemaPresent()) {
    console.log("Schema already present; skipping migration.");
    return;
  }

  const migrationFile = path.join(
    __dirname,
    "migrations",
    "0000_public_adam_warlock.sql",
  );
  const migrationSql = fs.readFileSync(migrationFile, "utf8");
  const statements = migrationSql.split("--> statement-breakpoint");

  for (const statement of statements) {
    const trimmedStatement = statement.trim();
    if (trimmedStatement.length > 0) {
      await client.query(trimmedStatement);
    }
  }

  console.log("Migration completed successfully");
}

try {
  await runMigration();
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
  console.log("Disconnected from PostgreSQL database");
}

if (process.exitCode === 1) {
  process.exit(1);
}
