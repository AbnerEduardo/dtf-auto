import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseStorage = !!(supabaseUrl && supabaseKey);

let supabase: SupabaseClient | null = null;
if (isSupabaseStorage) {
  supabase = createClient(supabaseUrl!, supabaseKey!);
}

export interface StorageUploadResult {
  success: boolean;
  publicUrl: string;
  storagePath: string;
  bucket: string;
  error?: string;
}

/**
 * Upload an artwork image to private bucket arts/{userId}/{filename}
 */
export async function uploadArtworkFile(
  userId: string,
  filename: string,
  buffer: Buffer,
  contentType = 'image/png'
): Promise<StorageUploadResult> {
  const sanitizedFilename = filename.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  const storagePath = `${userId}/${sanitizedFilename}`;

  if (isSupabaseStorage && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('arts')
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('Supabase Storage upload error:', error);
      } else {
        // Generate signed URL valid for 24 hours for canvas editor preview
        const { data: signedData } = await supabase.storage
          .from('arts')
          .createSignedUrl(storagePath, 60 * 60 * 24);

        return {
          success: true,
          publicUrl: signedData?.signedUrl || `/uploads/arts/${sanitizedFilename}`,
          storagePath,
          bucket: 'arts',
        };
      }
    } catch (e: any) {
      console.error('Error uploading to Supabase Storage:', e);
    }
  }

  // Fallback: Local Filesystem storage
  const localDir = path.join(process.cwd(), 'public', 'uploads', 'arts');
  fs.mkdirSync(localDir, { recursive: true });
  const localFilePath = path.join(localDir, sanitizedFilename);
  fs.writeFileSync(localFilePath, buffer);

  return {
    success: true,
    publicUrl: `/uploads/arts/${sanitizedFilename}`,
    storagePath: `arts/${storagePath}`,
    bucket: 'local',
  };
}

/**
 * Upload a rendered 300 DPI DTF roll PNG to private bucket queues/{userId}/{filename}
 */
export async function uploadQueueRenderFile(
  userId: string,
  filename: string,
  buffer: Buffer
): Promise<StorageUploadResult> {
  const sanitizedFilename = filename.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  const storagePath = `${userId}/${sanitizedFilename}`;

  if (isSupabaseStorage && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('queues')
        .upload(storagePath, buffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) {
        console.error('Supabase Storage queue upload error:', error);
      } else {
        // Generate signed URL valid for 2 hours for safe client download
        const { data: signedData } = await supabase.storage
          .from('queues')
          .createSignedUrl(storagePath, 60 * 60 * 2);

        return {
          success: true,
          publicUrl: signedData?.signedUrl || `/uploads/queues/${sanitizedFilename}`,
          storagePath,
          bucket: 'queues',
        };
      }
    } catch (e: any) {
      console.error('Error uploading queue render to Supabase Storage:', e);
    }
  }

  // Fallback: Local Filesystem storage
  const localDir = path.join(process.cwd(), 'public', 'uploads', 'queues');
  fs.mkdirSync(localDir, { recursive: true });
  const localFilePath = path.join(localDir, sanitizedFilename);
  fs.writeFileSync(localFilePath, buffer);

  return {
    success: true,
    publicUrl: `/uploads/queues/${sanitizedFilename}`,
    storagePath: `queues/${storagePath}`,
    bucket: 'local',
  };
}

/**
 * Fetch image buffer from local path or remote URL for Sharp composition
 */
export async function fetchImageBufferForSharp(imagePath: string): Promise<Buffer | null> {
  if (!imagePath) return null;

  // Remote HTTP/HTTPS URL (Signed URL or external storage)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const response = await fetch(imagePath);
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (err) {
      console.error('Error fetching remote image buffer:', imagePath, err);
    }
  }

  // Local filesystem path
  let localPath = '';
  if (imagePath.startsWith('/')) {
    localPath = path.join(process.cwd(), 'public', imagePath.slice(1));
  } else {
    localPath = path.join(process.cwd(), 'public', imagePath);
  }

  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  return null;
}
