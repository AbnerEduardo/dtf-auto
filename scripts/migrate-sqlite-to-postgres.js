/**
 * Data Migration Script: SQLite -> PostgreSQL / Supabase
 * Usage: node scripts/migrate-sqlite-to-postgres.js
 */
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const sqlitePath = path.join(process.cwd(), 'dtf_auto.sqlite');
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL or POSTGRES_URL environment variable is required.');
  console.log('Example: DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres" node scripts/migrate-sqlite-to-postgres.js');
  process.exit(1);
}

if (!fs.existsSync(sqlitePath)) {
  console.error('ERROR: Local SQLite database not found at:', sqlitePath);
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const pgPool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('=== DTF AUTO PRO: MIGRATION SQLITE -> POSTGRESQL ===');
  console.log('1. Applying schema to PostgreSQL...');
  
  const schemaSql = fs.readFileSync(path.join(process.cwd(), 'src/lib/schema.sql'), 'utf8');
  await pgPool.query(schemaSql);
  console.log('Schema applied successfully.');

  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    // 1. Users
    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`Migrating ${users.length} users...`);
    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, name, email, password, company, role, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
        ON CONFLICT(id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          company = EXCLUDED.company
      `, [u.id, u.name, u.email, u.password, u.company || '', 'user', 'trial', u.created_at]);
    }

    // 2. Subscriptions
    const subs = sqlite.prepare('SELECT * FROM subscriptions').all();
    console.log(`Migrating ${subs.length} subscriptions...`);
    for (const s of subs) {
      await client.query(`
        INSERT INTO subscriptions (id, user_id, status, plan_name, price_monthly, trial_ends_at, current_period_end, pix_code, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()))
        ON CONFLICT(id) DO NOTHING
      `, [s.id, s.user_id, s.status, s.plan_name, s.price_monthly, s.trial_ends_at, s.current_period_end, s.pix_code, s.created_at]);
    }

    // 3. Products
    const products = sqlite.prepare('SELECT * FROM products').all();
    console.log(`Migrating ${products.length} products...`);
    for (const p of products) {
      await client.query(`
        INSERT INTO products (id, user_id, name, category, created_at)
        VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
        ON CONFLICT(id) DO NOTHING
      `, [p.id, p.user_id, p.name, p.category, p.created_at]);
    }

    // 4. SKUs
    const skus = sqlite.prepare('SELECT * FROM skus').all();
    console.log(`Migrating ${skus.length} SKUs...`);
    for (const k of skus) {
      await client.query(`
        INSERT INTO skus (id, user_id, product_id, sku, sku_aliases, title, image_path, width_cm, height_cm, original_width_px, original_height_px, dpi_calculated, has_transparency, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, NOW()))
        ON CONFLICT(id) DO UPDATE SET
          sku_aliases = EXCLUDED.sku_aliases,
          title = EXCLUDED.title,
          width_cm = EXCLUDED.width_cm,
          height_cm = EXCLUDED.height_cm,
          image_path = EXCLUDED.image_path
      `, [k.id, k.user_id, k.product_id, k.sku, k.sku_aliases || '', k.title, k.image_path, k.width_cm, k.height_cm, k.original_width_px, k.original_height_px, k.dpi_calculated, k.has_transparency, k.created_at]);
    }

    // 5. Print Queues
    const queues = sqlite.prepare('SELECT * FROM print_queues').all();
    console.log(`Migrating ${queues.length} print queues...`);
    for (const q of queues) {
      await client.query(`
        INSERT INTO print_queues (id, user_id, name, roll_width_cm, roll_height_cm, margin_cm, spacing_cm, allow_rotation, total_items, efficiency_percent, estimated_savings_brl, saved_linear_cm, highres_image_path, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, NOW()))
        ON CONFLICT(id) DO NOTHING
      `, [q.id, q.user_id, q.name, q.roll_width_cm, q.roll_height_cm, q.margin_cm, q.spacing_cm, q.allow_rotation, q.total_items, q.efficiency_percent, q.estimated_savings_brl, q.saved_linear_cm, q.highres_image_path, q.created_at]);
    }

    // 6. Queue Items
    const queueItems = sqlite.prepare('SELECT * FROM queue_items').all();
    console.log(`Migrating ${queueItems.length} queue items...`);
    for (const qi of queueItems) {
      await client.query(`
        INSERT INTO queue_items (id, queue_id, sku_id, sku_code, title, x_cm, y_cm, width_cm, height_cm, rotated, rotation, image_path, garment_info)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT(id) DO NOTHING
      `, [qi.id, qi.queue_id, qi.sku_id, qi.sku_code, qi.title, qi.x_cm, qi.y_cm, qi.width_cm, qi.height_cm, qi.rotated, qi.rotation || 0, qi.image_path, qi.garment_info]);
    }

    // 7. Order Batches
    const batches = sqlite.prepare('SELECT * FROM order_batches').all();
    console.log(`Migrating ${batches.length} order batches...`);
    for (const b of batches) {
      await client.query(`
        INSERT INTO order_batches (id, user_id, source_filename, total_garments, garments_json, created_at)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
        ON CONFLICT(id) DO NOTHING
      `, [b.id, b.user_id, b.source_filename, b.total_garments, b.garments_json, b.created_at]);
    }

    // 8. DTF Settings
    const settings = sqlite.prepare('SELECT * FROM dtf_settings').all();
    console.log(`Migrating ${settings.length} user settings...`);
    for (const st of settings) {
      await client.query(`
        INSERT INTO dtf_settings (user_id, roll_width_cm, spacing_cm, margin_cm, allow_rotation, default_adult_height_cm, default_plussize_height_cm, default_infant_height_cm, default_moletom_height_cm, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()))
        ON CONFLICT(user_id) DO UPDATE SET
          roll_width_cm = EXCLUDED.roll_width_cm,
          spacing_cm = EXCLUDED.spacing_cm,
          margin_cm = EXCLUDED.margin_cm,
          allow_rotation = EXCLUDED.allow_rotation
      `, [st.user_id, st.roll_width_cm, st.spacing_cm, st.margin_cm, st.allow_rotation, st.default_adult_height_cm, st.default_plussize_height_cm, st.default_infant_height_cm, st.default_moletom_height_cm, st.updated_at]);
    }

    // 9. Current Metro Session
    const sessions = sqlite.prepare('SELECT * FROM current_metro_session').all();
    console.log(`Migrating ${sessions.length} active sessions...`);
    for (const ss of sessions) {
      await client.query(`
        INSERT INTO current_metro_session (user_id, roll_width_cm, roll_height_cm, margin_cm, spacing_cm, allow_rotation, items_json, placed_items_json, source_filename, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()))
        ON CONFLICT(user_id) DO UPDATE SET
          roll_width_cm = EXCLUDED.roll_width_cm,
          roll_height_cm = EXCLUDED.roll_height_cm,
          items_json = EXCLUDED.items_json,
          placed_items_json = EXCLUDED.placed_items_json,
          source_filename = EXCLUDED.source_filename,
          updated_at = NOW()
      `, [ss.user_id, ss.roll_width_cm, ss.roll_height_cm, ss.margin_cm, ss.spacing_cm, ss.allow_rotation, ss.items_json, ss.placed_items_json, ss.source_filename, ss.updated_at]);
    }

    await client.query('COMMIT');
    console.log('=== MIGRATION COMPLETED WITH 100% SUCCESS ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
  } finally {
    client.release();
    await pgPool.end();
  }
}

runMigration().catch(console.error);
