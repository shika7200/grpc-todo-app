import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { todos } from './schema';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// можно экспортнуть todo тоже, чтобы не лазить в schema:
export { todos };
