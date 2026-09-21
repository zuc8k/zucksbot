ts
import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config: PoolOptions = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'zucks',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
};

const db: Pool = mysql.createPool(config);

(async (): Promise<void> => {
  try {
    const conn = await db.getConnection();
    console.log('[ZUCKS] ✅ Connected to MariaDB');
    conn.release();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ZUCKS] ❌ DB error:', msg);
  }
})();

export default db;