import { canUserAccess } from '@/lib/accessControl';
import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';
import { computeDTFNesting, NestingInputItem } from '@/lib/nesting';

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const access = await canUserAccess(userId);
    if (!access.canAccess) {
      return NextResponse.json({ error: access.reason || 'Período de teste de 7 dias expirado. Ative sua assinatura para continuar.', expired: true }, { status: 403 });
    }

    const {
      items,
      rollWidthCm = 57.0,
      marginCm = 1.0,
      spacingCm = 1.0,
      allowRotation = true,
      name = 'Fila DTF de Produção (57 cm)',
    } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Nenhum item informado para montar a fila' }, { status: 400 });
    }

    // Fetch user's registered SKUs to ensure real artwork and dimensions are placed on the roll
    const userSkus = db.prepare('SELECT * FROM skus WHERE user_id = ?').all(userId) as any[];

    // Multiply items by their quantities
    const flatItems: NestingInputItem[] = [];
    items.forEach((it: any) => {
      const qty = it.quantity || 1;
      const skuCode = (it.sku || '').trim().toUpperCase();
      const rawSkuCode = (it.rawSku || '').trim().toUpperCase();
      const titleLower = (it.title || it.productTitle || '').toLowerCase();

      // Find match in catalog
      const matchedSku = userSkus.find((s) => {
        const regSku = (s.sku || '').trim().toUpperCase();
        if (skuCode && regSku === skuCode) return true;
        if (rawSkuCode && regSku === rawSkuCode) return true;
        if (s.sku_aliases) {
          const aliases = s.sku_aliases.split(',').map((a: string) => a.trim().toUpperCase()).filter(Boolean);
          if (skuCode && aliases.includes(skuCode)) return true;
          if (rawSkuCode && aliases.includes(rawSkuCode)) return true;
        }
        const regTitle = (s.title || '').trim().toLowerCase();
        if (regTitle && regTitle.length > 2 && titleLower.includes(regTitle)) return true;
        return false;
      });

      const effectiveImage = matchedSku?.image_path || it.imagePath || '/samples/boston.png';
      const effectiveTitle = matchedSku?.title || it.title || it.productTitle || it.sku;
      const effectiveWidth = matchedSku?.width_cm || parseFloat(it.widthCm || '24');
      const effectiveHeight = matchedSku?.height_cm || parseFloat(it.heightCm || '28');

      for (let i = 0; i < qty; i++) {
        flatItems.push({
          id: `${it.sku}_${i + 1}_${Math.random().toString(36).substring(2, 7)}`,
          sku: matchedSku?.sku || it.sku,
          title: effectiveTitle,
          widthCm: effectiveWidth,
          heightCm: effectiveHeight,
          imagePath: effectiveImage,
          garmentInfo: `${it.garmentType || 'Peça'} ${it.color || ''} ${it.size || ''}`.trim(),
          rotation: it.rotation || 0,
        });
      }
    });

    const nesting = computeDTFNesting(flatItems, rollWidthCm, marginCm, spacingCm, allowRotation);
    const queueId = 'queue_' + Date.now();

    db.prepare(`
      INSERT INTO print_queues (
        id, user_id, name, roll_width_cm, roll_height_cm, margin_cm, spacing_cm,
        allow_rotation, total_items, efficiency_percent, estimated_savings_brl, saved_linear_cm
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      queueId,
      userId,
      name,
      nesting.rollWidthCm,
      nesting.rollHeightCm,
      marginCm,
      spacingCm,
      allowRotation ? 1 : 0,
      flatItems.length,
      nesting.efficiencyPercent,
      nesting.estimatedSavingsBrl,
      nesting.linearSavingsCm
    );

    db.prepare(`
      INSERT INTO dtf_jobs (
        id, user_id, name, roll_width_cm, roll_height_cm, margin_cm, spacing_cm,
        allow_rotation, total_items, efficiency_percent, estimated_savings_brl, saved_linear_cm
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'job_' + Date.now(),
      userId,
      name,
      nesting.rollWidthCm,
      nesting.rollHeightCm,
      marginCm,
      spacingCm,
      allowRotation ? 1 : 0,
      flatItems.length,
      nesting.efficiencyPercent,
      nesting.estimatedSavingsBrl,
      nesting.linearSavingsCm
    );

    const insertItem = db.prepare(`
      INSERT INTO queue_items (id, queue_id, sku_id, sku_code, title, x_cm, y_cm, width_cm, height_cm, rotated, rotation, image_path, garment_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    nesting.placedItems.forEach((p) => {
      insertItem.run(
        p.id,
        queueId,
        p.sku,
        p.sku,
        p.title,
        p.xCm,
        p.yCm,
        p.widthCm,
        p.heightCm,
        p.rotated ? 1 : 0,
        p.rotation || (p.rotated ? 90 : 0),
        p.imagePath,
        p.garmentInfo || ''
      );
    });

    return NextResponse.json({
      success: true,
      queueId,
      nesting,
    });
  } catch (err: any) {
    console.error('Error generating DTF queue:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
