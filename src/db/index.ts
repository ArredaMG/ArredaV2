import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = import.meta.env.VITE_DATABASE_URL || '';
const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
