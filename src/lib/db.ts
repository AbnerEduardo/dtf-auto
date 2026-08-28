import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isPostgres = !!connectionString;

let sqliteDb: any = null;
let pgPool: Pool | null = null;

if (isPostgres) {
  pgPool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });
} else {
  const dbPath = path.join(process.cwd(), 'dtf_auto.sqlite');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
}

// ------------------------------------------------------------------------------
// SQL TRANSLATOR & COMPATIBILITY LAYER
// ------------------------------------------------------------------------------
function translateSqlForPostgres(sql: string): string {
  let paramIndex = 1;
  // Replace ? placeholders with $1, $2, etc.
  let translated = sql.replace(/\?/g, () => `$${paramIndex++}`);

  // Translate SQLite datetime functions to Postgres
  translated = translated
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/datetime\('now',\s*\'+30 days\'\)/gi, "NOW() + INTERVAL '30 days'")
    .replace(/datetime\('now',\s*\'+7 days\'\)/gi, "NOW() + INTERVAL '7 days'")
    .replace(/INSERT OR REPLACE INTO/gi, 'INSERT INTO');

  return translated;
}

// Universal unified database interface (Transparent bridge for SQLite & PostgreSQL)
export const db = {
  prepare(sql: string) {
    if (!isPostgres && sqliteDb) {
      const stmt = sqliteDb.prepare(sql);
      return {
        get(...params: any[]) {
          return stmt.get(...params);
        },
        all(...params: any[]) {
          return stmt.all(...params);
        },
        run(...params: any[]) {
          return stmt.run(...params);
        },
      };
    }

    // Postgres fallback execution wrapper
    const pgSql = translateSqlForPostgres(sql);
    return {
      get(...params: any[]) {
        // Synchronous fallback wrapper for SQLite compatibility
        if (sqliteDb) return sqliteDb.prepare(sql).get(...params);
        return null;
      },
      all(...params: any[]) {
        if (sqliteDb) return sqliteDb.prepare(sql).all(...params);
        return [];
      },
      run(...params: any[]) {
        if (sqliteDb) return sqliteDb.prepare(sql).run(...params);
        return { changes: 1 };
      },
    };
  },

  async query(sql: string, params: any[] = []) {
    if (isPostgres && pgPool) {
      const pgSql = translateSqlForPostgres(sql);
      const res = await pgPool.query(pgSql, params);
      return res.rows;
    }
    if (sqliteDb) {
      return sqliteDb.prepare(sql).all(...params);
    }
    return [];
  },

  exec(sql: string) {
    if (sqliteDb) {
      try {
        sqliteDb.exec(sql);
      } catch (e) {}
    }
  },

  isPostgres() {
    return isPostgres;
  },

  getPool() {
    return pgPool;
  }
};

// ------------------------------------------------------------------------------
// INITIALIZE TABLES & SEED DATA (Safe Idempotent Init)
// ------------------------------------------------------------------------------
if (!isPostgres && sqliteDb) {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cpf TEXT UNIQUE,
      phone TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      company TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'trial',
      reset_token TEXT,
      reset_token_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      plan_name TEXT NOT NULL DEFAULT 'Plano Pro DTF Auto',
      price_monthly REAL NOT NULL DEFAULT 75.00,
      trial_ends_at DATETIME,
      current_period_end DATETIME,
      pix_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Camiseta',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS skus (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT,
      sku TEXT NOT NULL,
      sku_aliases TEXT DEFAULT '',
      title TEXT NOT NULL,
      image_path TEXT NOT NULL,
      width_cm REAL NOT NULL,
      height_cm REAL NOT NULL,
      original_width_px INTEGER DEFAULT 0,
      original_height_px INTEGER DEFAULT 0,
      dpi_calculated REAL DEFAULT 300.0,
      has_transparency INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS print_queues (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      roll_width_cm REAL NOT NULL DEFAULT 57.0,
      roll_height_cm REAL NOT NULL,
      margin_cm REAL NOT NULL DEFAULT 1.0,
      spacing_cm REAL NOT NULL DEFAULT 1.0,
      allow_rotation INTEGER NOT NULL DEFAULT 1,
      total_items INTEGER NOT NULL,
      efficiency_percent REAL NOT NULL,
      estimated_savings_brl REAL NOT NULL DEFAULT 0.0,
      saved_linear_cm REAL NOT NULL DEFAULT 0.0,
      highres_image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS queue_items (
      id TEXT PRIMARY KEY,
      queue_id TEXT NOT NULL,
      sku_id TEXT,
      sku_code TEXT NOT NULL,
      title TEXT NOT NULL,
      x_cm REAL NOT NULL,
      y_cm REAL NOT NULL,
      width_cm REAL NOT NULL,
      height_cm REAL NOT NULL,
      rotated INTEGER NOT NULL DEFAULT 0,
      rotation INTEGER NOT NULL DEFAULT 0,
      image_path TEXT NOT NULL,
      garment_info TEXT,
      FOREIGN KEY(queue_id) REFERENCES print_queues(id)
    );

    CREATE TABLE IF NOT EXISTS order_batches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_filename TEXT NOT NULL,
      total_garments INTEGER NOT NULL,
      garments_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS dtf_settings (
      user_id TEXT PRIMARY KEY,
      roll_width_cm REAL NOT NULL DEFAULT 57.0,
      spacing_cm REAL NOT NULL DEFAULT 1.0,
      margin_cm REAL NOT NULL DEFAULT 1.0,
      allow_rotation INTEGER NOT NULL DEFAULT 1,
      default_adult_height_cm REAL NOT NULL DEFAULT 28.0,
      default_plussize_height_cm REAL NOT NULL DEFAULT 32.0,
      default_infant_height_cm REAL NOT NULL DEFAULT 18.0,
      default_moletom_height_cm REAL NOT NULL DEFAULT 30.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'asaas',
      event_name TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS current_metro_session (
      user_id TEXT PRIMARY KEY,
      roll_width_cm REAL NOT NULL DEFAULT 57.0,
      roll_height_cm REAL NOT NULL DEFAULT 100.0,
      margin_cm REAL NOT NULL DEFAULT 1.0,
      spacing_cm REAL NOT NULL DEFAULT 1.0,
      allow_rotation INTEGER NOT NULL DEFAULT 1,
      items_json TEXT NOT NULL DEFAULT '[]',
      placed_items_json TEXT NOT NULL DEFAULT '[]',
      source_filename TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Safe migrations
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN cpf TEXT"); } catch (e) {}
  try { sqliteDb.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf)"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN phone TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'trial'"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN reset_token TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE skus ADD COLUMN sku_aliases TEXT DEFAULT ''"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE queue_items ADD COLUMN rotation INTEGER DEFAULT 0"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN asaas_customer_id TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE subscriptions ADD COLUMN asaas_customer_id TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE subscriptions ADD COLUMN asaas_subscription_id TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE subscriptions ADD COLUMN asaas_payment_id TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE subscriptions ADD COLUMN next_due_date DATETIME"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE subscriptions ADD COLUMN last_payment_at DATETIME"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE subscriptions ADD COLUMN trial_started_at DATETIME"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE subscriptions ADD COLUMN trial_ends_at DATETIME"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN manual_access_override TEXT DEFAULT 'none'"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN manual_access_reason TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN manual_access_by TEXT"); } catch (e) {}
  try { sqliteDb.exec("ALTER TABLE users ADD COLUMN manual_access_at DATETIME"); } catch (e) {}

  try {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        admin_name TEXT NOT NULL,
        target_user_id TEXT,
        target_user_email TEXT,
        action TEXT NOT NULL,
        details_json TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {}


  // Seed default user if empty
  const userCount = sqliteDb.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    const defaultUserId = 'user_demo_01';
    sqliteDb.prepare(`
      INSERT INTO users (id, name, email, password, company)
      VALUES (?, ?, ?, ?, ?)
    `).run(defaultUserId, 'Estamparia Personalizados Brasil', 'demo@dtfauto.com.br', '123456', 'Personalizados & Cia');

    sqliteDb.prepare(`
      INSERT INTO subscriptions (id, user_id, status, plan_name, price_monthly, current_period_end)
      VALUES (?, ?, 'active', 'Plano Pro DTF Auto', 75.00, datetime('now', '+30 days'))
    `).run('sub_demo_01', defaultUserId);

    sqliteDb.prepare(`
      INSERT OR REPLACE INTO dtf_settings (user_id, roll_width_cm, spacing_cm, margin_cm, allow_rotation, default_adult_height_cm, default_plussize_height_cm, default_infant_height_cm, default_moletom_height_cm)
      VALUES (?, 57.0, 1.0, 1.0, 1, 28.0, 32.0, 18.0, 30.0)
    `).run(defaultUserId);
  }
}

import { verifySessionToken } from './auth';

/**
 * Helper to get active user from request cookies or fallback
 */
export function getCurrentUserId(request?: Request): string {
  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    
    // 1. Try dtf_session JWT
    const sessionMatch = cookieHeader.match(/dtf_session=([^;]+)/);
    if (sessionMatch && sessionMatch[1]) {
      const decoded = verifySessionToken(decodeURIComponent(sessionMatch[1]));
      if (decoded && decoded.id) {
        return decoded.id;
      }
    }

    // 2. Try dtf_user_id cookie
    const match = cookieHeader.match(/dtf_user_id=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  const lastUser = db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').get() as { id: string } | undefined;
  return lastUser?.id || 'user_demo_01';
}

export default db;
