/**
 * Storage Migration Script: Local public/uploads -> Supabase Storage
 * Usage: node scripts/migrate-local-files-to-storage.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  console.log('Example: SUPABASE_URL="https://xxx.supabase.co" SUPABASE_SERVICE_ROLE_KEY="eyJ..." node scripts/migrate-local-files-to-storage.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const defaultUserId = 'user_demo_01';

async function migrateFolder(localSubdir, bucketName) {
  const localDir = path.join(process.cwd(), 'public', 'uploads', localSubdir);
  if (!fs.existsSync(localDir)) {
    console.log(`Directory ${localDir} does not exist. Skipping.`);
    return;
  }

  const files = fs.readdirSync(localDir);
  console.log(`Migrating ${files.length} files from ${localSubdir} to bucket '${bucketName}'...`);

  for (const filename of files) {
    const fullPath = path.join(localDir, filename);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      const fileBuffer = fs.readFileSync(fullPath);
      const storagePath = `${defaultUserId}/${filename}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
          upsert: true
        });

      if (error) {
        console.error(`Failed to upload ${filename}:`, error.message);
      } else {
        console.log(`✓ Uploaded: ${storagePath}`);
      }
    }
  }
}

async function run() {
  console.log('=== DTF AUTO PRO: MIGRATION LOCAL FILES -> SUPABASE STORAGE ===');
  await migrateFolder('arts', 'arts');
  await migrateFolder('queues', 'queues');
  console.log('=== STORAGE MIGRATION FINISHED ===');
}

run().catch(console.error);
