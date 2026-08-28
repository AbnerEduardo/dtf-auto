import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';
import { canUserAccess } from '@/lib/accessControl';
import { uploadArtworkFile } from '@/lib/storage';
import sharp from 'sharp';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.png', '.svg', '.webp', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];

export async function GET(request: Request) {
  const userId = getCurrentUserId(request);
  const skus = db.prepare('SELECT * FROM skus WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return NextResponse.json({ skus });
}

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const access = await canUserAccess(userId);
    if (!access.canAccess) {
      return NextResponse.json({ error: access.reason || 'Acesso bloqueado ou período de teste expirado.', expired: true }, { status: 403 });
    }

    const formData = await request.formData();
    const skuCode = String(formData.get('sku') || '').trim().toUpperCase().slice(0, 50);
    const skuAliases = String(formData.get('sku_aliases') || '').trim().slice(0, 200);
    const title = String(formData.get('title') || '').trim().slice(0, 100);
    const heightCm = parseFloat(String(formData.get('height_cm') || '28'));
    let widthCm = parseFloat(String(formData.get('width_cm') || '0'));
    const file = formData.get('image') as File | null;

    if (!skuCode || !title || !heightCm || isNaN(heightCm) || heightCm <= 0 || heightCm > 500) {
      return NextResponse.json({ error: 'Preencha o código SKU, título e altura válida em cm (máx 500cm)' }, { status: 400 });
    }

    let imagePath = '/samples/boston.png';
    let originalWPx = 800;
    let originalHPx = 667;
    let dpiCalculated = 300.0;
    let hasTransparency = 1;

    if (file && file.size > 0) {
      // Security: File Size Check
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Arquivo excede o limite máximo permitido de 50MB' }, { status: 400 });
      }

      // Security: File Extension & MIME Check
      const ext = (file.name.slice(file.name.lastIndexOf('.')) || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Formato de arquivo inválido. Permitidos: PNG, SVG, WEBP, JPG' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filename = `sku-${skuCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.png`;

      const isSvg = ext === '.svg' || file.type === 'image/svg+xml';
      let pipeline = isSvg ? sharp(buffer, { density: 300 }) : sharp(buffer);
      const metadata = await pipeline.metadata();

      originalWPx = metadata.width || 800;
      originalHPx = metadata.height || 667;
      hasTransparency = metadata.hasAlpha ? 1 : (isSvg ? 1 : 0);

      // Strict proportional width calculation
      const aspectRatio = originalWPx / originalHPx;
      widthCm = Number((heightCm * aspectRatio).toFixed(1));

      // Calculate real DPI for physical dimensions
      const dpiX = (originalWPx / widthCm) * 2.54;
      const dpiY = (originalHPx / heightCm) * 2.54;
      dpiCalculated = Number(Math.min(dpiX, dpiY).toFixed(1));

      // Convert to clean PNG buffer with Alpha preservation
      const pngBuffer = await pipeline.png({ compressionLevel: 6, adaptiveFiltering: true }).toBuffer();

      // Upload to Storage
      const uploadResult = await uploadArtworkFile(userId, filename, pngBuffer, 'image/png');
      imagePath = uploadResult.publicUrl;

      // Insert artwork record
      db.prepare(`
        INSERT INTO artworks (id, user_id, sku_id, filename, file_path, mime_type, width_px, height_px, has_alpha)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('art_' + Date.now(), userId, skuCode, filename, imagePath, isSvg ? 'image/svg+xml' : 'image/png', originalWPx, originalHPx, hasTransparency);
    } else {
      if (!widthCm || widthCm <= 0) {
        widthCm = Number((heightCm * 1.0).toFixed(1));
      }
      originalWPx = Math.round(widthCm * 118.11);
      originalHPx = Math.round(heightCm * 118.11);
    }

    const id = 'sku_' + Date.now();
    db.prepare(`
      INSERT INTO skus (id, user_id, sku, sku_aliases, title, image_path, width_cm, height_cm, original_width_px, original_height_px, dpi_calculated, has_transparency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, skuCode, skuAliases, title, imagePath, widthCm, heightCm, originalWPx, originalHPx, dpiCalculated, hasTransparency);

    const createdSku = db.prepare('SELECT * FROM skus WHERE id = ? AND user_id = ?').get(id, userId);
    return NextResponse.json({ success: true, sku: createdSku });
  } catch (err: any) {
    console.error('Error saving SKU:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
