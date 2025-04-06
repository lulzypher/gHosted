// migrate.js
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pkg;

// Get database connection string from environment variables
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a new PostgreSQL client
const client = new Client({
  connectionString: dbUrl,
});

async function runMigration() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Read the migration file
    const migrationFile = path.join(__dirname, 'migrations', '0000_public_adam_warlock.sql');
    const migrationSql = fs.readFileSync(migrationFile, 'utf8');

    // Split the SQL statements
    const statements = migrationSql.split('--> statement-breakpoint');

    // Execute each statement
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement.length > 0) {
        try {
          await client.query(trimmedStatement);
          console.log('Executed statement successfully');
        } catch (err) {
          console.error('Error executing statement:', err.message);
          console.error('Statement:', trimmedStatement);
        }
      }
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Disconnected from PostgreSQL database');
  }
}

runMigration();