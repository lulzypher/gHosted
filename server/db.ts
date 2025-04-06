import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

// Use the DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString);

// Create a drizzle instance
export const db = drizzle(client, { schema });