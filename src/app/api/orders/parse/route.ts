import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';
import { canUserAccess } from '@/lib/accessControl';
import { parseExcelOrderFile, parseTextOrPdfOrders, buildGarmentPickingSummary, ParsedOrderItem } from '@/lib/orderParser';

const MAX_ORDER_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_ORDER_EXTS = ['.pdf', '.xlsx', '.xls', '.csv', '.txt'];

export async function GET(request: Request) {
  const userId = getCurrentUserId(request);
  const latestBatch = db.prepare('SELECT * FROM order_batches WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;

  if (latestBatch) {
    try {
      const parsedData = JSON.parse(latestBatch.garments_json);
      return NextResponse.json({
        success: true,
        filename: latestBatch.source_filename,
        totalPieces: latestBatch.total_garments,
        items: parsedData.items,
        pickingSummary: parsedData.pickingSummary,
      });
    } catch (e) {}
  }

  return NextResponse.json({ items: [], pickingSummary: [] });
}

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const access = await canUserAccess(userId);
    if (!access.canAccess) {
      return NextResponse.json({ error: access.reason || 'Acesso bloqueado ou período de teste expirado.', expired: true }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const manualText = String(formData.get('manualText') || '').trim();

    let parsedItems: ParsedOrderItem[] = [];
    let filename = 'manual_input.txt';

    if (file && file.size > 0) {
      if (file.size > MAX_ORDER_FILE_SIZE) {
        return NextResponse.json({ error: 'Arquivo excede o limite máximo permitido de 50MB' }, { status: 400 });
      }

      const ext = (file.name.slice(file.name.lastIndexOf('.')) || '').toLowerCase();
      if (!ALLOWED_ORDER_EXTS.includes(ext)) {
        return NextResponse.json({ error: 'Formato não suportado. Envie arquivos PDF, Excel (.xlsx, .xls) ou CSV.' }, { status: 400 });
      }

      filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        parsedItems = parseExcelOrderFile(buffer);
      } else if (ext === '.pdf') {
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        parsedItems = parseTextOrPdfOrders(pdfData.text || '');
      } else {
        const text = buffer.toString('utf8');
        parsedItems = parseTextOrPdfOrders(text);
      }
    } else if (manualText) {
      parsedItems = parseTextOrPdfOrders(manualText);
    } else {
      return NextResponse.json({ error: 'Nenhum arquivo ou texto informado para processar.' }, { status: 400 });
    }

    // Match SKUs strictly for this authenticated user
    const userSkus = db.prepare('SELECT * FROM skus WHERE user_id = ?').all(userId) as any[];
    const settings = db.prepare('SELECT * FROM dtf_settings WHERE user_id = ?').get(userId) as any;

    const enrichedItems = parsedItems.map((item) => {
      const skuCode = (item.sku || '').trim().toUpperCase();
      const rawSkuCode = (item.rawSku || '').trim().toUpperCase();
      const titleLower = (item.productTitle || '').toLowerCase();
      const varLower = (item.variation || '').toLowerCase();

      // Match against user's registered SKUs in catalog
      let matchedSku = userSkus.find((s) => {
        const regSku = (s.sku || '').trim().toUpperCase();
        // 1. Match on SKU code (from PDF SKU column or input)
        if (rawSkuCode && regSku === rawSkuCode) return true;
        if (skuCode && regSku === skuCode) return true;

        // 2. Match in SKU aliases / variations list
        if (s.sku_aliases) {
          const aliases = s.sku_aliases.split(',').map((a: string) => a.trim().toUpperCase()).filter(Boolean);
          if (rawSkuCode && aliases.includes(rawSkuCode)) return true;
          if (skuCode && aliases.includes(skuCode)) return true;
        }

        // 3. Match in print title / name
        const regTitle = (s.title || '').trim().toLowerCase();
        if (regTitle && regTitle.length > 2 && (titleLower.includes(regTitle) || varLower.includes(regTitle))) {
          return true;
        }

        return false;
      });

      let defaultH = 28.0;
      if (item.garmentType.includes('Plus Size')) defaultH = settings?.default_plussize_height_cm || 32.0;
      else if (item.garmentType.includes('Infantil')) defaultH = settings?.default_infant_height_cm || 18.0;
      else if (item.garmentType.includes('Moletom')) defaultH = settings?.default_moletom_height_cm || 30.0;

      // When matched: USE the registered print's clean title, uploaded artwork image and real dimensions!
      const displayTitle = matchedSku ? matchedSku.title : (item.productTitle || item.sku);
      const displaySku = matchedSku ? matchedSku.sku : (item.sku || item.rawSku);
      const imagePath = matchedSku ? matchedSku.image_path : '/samples/boston.png';
      const widthCm = matchedSku ? matchedSku.width_cm : Number((defaultH * 0.85).toFixed(1));
      const heightCm = matchedSku ? matchedSku.height_cm : defaultH;

      return {
        ...item,
        sku: displaySku,
        productTitle: displayTitle,
        title: displayTitle,
        skuFound: !!matchedSku,
        skuId: matchedSku?.id,
        imagePath,
        widthCm,
        heightCm,
        dpi: matchedSku ? matchedSku.dpi_calculated : 300,
        hasAlpha: matchedSku ? matchedSku.has_transparency === 1 : true,
      };
    });

    const pickingSummary = buildGarmentPickingSummary(enrichedItems);
    const totalPieces = enrichedItems.reduce((acc, it) => acc + it.quantity, 0);

    const batchId = 'batch_' + Date.now();
    db.prepare(`
      INSERT INTO order_batches (id, user_id, source_filename, total_garments, garments_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      batchId,
      userId,
      filename,
      totalPieces,
      JSON.stringify({ items: enrichedItems, pickingSummary })
    );

    return NextResponse.json({
      success: true,
      batchId,
      filename,
      totalPieces,
      items: enrichedItems,
      pickingSummary,
    });
  } catch (err: any) {
    console.error('Error parsing order batch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
