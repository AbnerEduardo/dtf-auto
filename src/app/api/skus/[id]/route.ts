import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getCurrentUserId(request);
  const sku = db.prepare('SELECT * FROM skus WHERE id = ? AND user_id = ?').get(id, userId);

  if (!sku) {
    return NextResponse.json({ error: 'SKU não encontrado ou acesso não autorizado' }, { status: 404 });
  }

  return NextResponse.json({ sku });
}

import { uploadArtworkFile } from '@/lib/storage';
import sharp from 'sharp';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.png', '.svg', '.webp', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = getCurrentUserId(request);

    const existing = db.prepare('SELECT * FROM skus WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return NextResponse.json({ error: 'SKU não encontrado ou acesso não autorizado' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    let sku = existing.sku;
    let title = existing.title;
    let skuAliases = existing.sku_aliases;
    let heightCm = existing.height_cm;
    let widthCm = existing.width_cm;
    let imagePath = existing.image_path;
    let originalWPx = existing.original_width_px;
    let originalHPx = existing.original_height_px;
    let dpiCalculated = existing.dpi_calculated;
    let hasTransparency = existing.has_transparency;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      if (formData.get('sku')) sku = String(formData.get('sku')).trim().toUpperCase();
      if (formData.get('title')) title = String(formData.get('title')).trim();
      if (formData.get('sku_aliases') !== null) skuAliases = String(formData.get('sku_aliases')).trim();
      if (formData.get('height_cm')) heightCm = parseFloat(String(formData.get('height_cm')).replace(',', '.')) || heightCm;
      if (formData.get('width_cm')) widthCm = parseFloat(String(formData.get('width_cm')).replace(',', '.')) || widthCm;

      const file = formData.get('image') as File | null;
      if (file && file.size > 0) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: 'Arquivo excede o limite máximo permitido de 50MB' }, { status: 400 });
        }

        const ext = (file.name.slice(file.name.lastIndexOf('.')) || '').toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
          return NextResponse.json({ error: 'Formato de arquivo inválido. Permitidos: PNG, SVG, WEBP, JPG' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `sku-${sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.png`;

        const isSvg = ext === '.svg' || file.type === 'image/svg+xml';
        let pipeline = isSvg ? sharp(buffer, { density: 300 }) : sharp(buffer);
        const metadata = await pipeline.metadata();

        originalWPx = metadata.width || 800;
        originalHPx = metadata.height || 667;
        hasTransparency = metadata.hasAlpha ? 1 : (isSvg ? 1 : 0);

        const aspectRatio = originalWPx / originalHPx;
        widthCm = Number((heightCm * aspectRatio).toFixed(1));

        const dpiX = (originalWPx / widthCm) * 2.54;
        const dpiY = (originalHPx / heightCm) * 2.54;
        dpiCalculated = Number(Math.min(dpiX, dpiY).toFixed(1));

        const pngBuffer = await pipeline.png({ compressionLevel: 6, adaptiveFiltering: true }).toBuffer();
        const uploadResult = await uploadArtworkFile(userId, filename, pngBuffer, 'image/png');
        imagePath = uploadResult.publicUrl;
      }
    } else {
      const body = await request.json();
      if (body.sku) sku = String(body.sku).trim().toUpperCase();
      if (body.title) title = String(body.title).trim();
      if (body.sku_aliases !== undefined) skuAliases = String(body.sku_aliases).trim();
      if (body.height_cm !== undefined) heightCm = parseFloat(String(body.height_cm).replace(',', '.')) || heightCm;
      if (body.width_cm !== undefined) widthCm = parseFloat(String(body.width_cm).replace(',', '.')) || widthCm;
      if (body.image_path) imagePath = String(body.image_path).trim();
    }

    db.prepare(`
      UPDATE skus
      SET sku = ?,
          title = ?,
          sku_aliases = ?,
          width_cm = ?,
          height_cm = ?,
          image_path = ?,
          original_width_px = ?,
          original_height_px = ?,
          dpi_calculated = ?,
          has_transparency = ?
      WHERE id = ? AND user_id = ?
    `).run(sku, title, skuAliases, widthCm, heightCm, imagePath, originalWPx, originalHPx, dpiCalculated, hasTransparency, id, userId);

    const updated = db.prepare('SELECT * FROM skus WHERE id = ? AND user_id = ?').get(id, userId);
    return NextResponse.json({ success: true, sku: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = getCurrentUserId(request);

    const existing = db.prepare('SELECT id FROM skus WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return NextResponse.json({ error: 'SKU não encontrado ou acesso não autorizado' }, { status: 404 });
    }

    db.prepare('DELETE FROM skus WHERE id = ? AND user_id = ?').run(id, userId);
    return NextResponse.json({ success: true, message: 'SKU excluído com sucesso' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
