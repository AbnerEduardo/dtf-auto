import { canUserAccess } from '@/lib/accessControl';
import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';
import { renderHighResDTFQueue } from '@/lib/imageComposer';

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const access = await canUserAccess(userId);
    if (!access.canAccess) {
      return NextResponse.json({ error: access.reason || 'Período de teste de 7 dias expirado. Ative sua assinatura para baixar em 300 DPI.', expired: true }, { status: 403 });
    }

    const body = await request.json();
    const { queueId, placedItems: customPlacedItems, rollWidthCm: customWidth, rollHeightCm: customHeight } = body;

    let targetWidth = customWidth || 57.0;
    let targetHeight = customHeight || 100.0;
    let itemsToRender = customPlacedItems;
    let effectiveQueueId = queueId || `manual_${Date.now()}`;

    if (!itemsToRender && queueId) {
      const queue = db.prepare('SELECT * FROM print_queues WHERE id = ? AND user_id = ?').get(queueId, userId) as any;
      if (queue) {
        targetWidth = queue.roll_width_cm;
        targetHeight = queue.roll_height_cm;
        const dbItems = db.prepare('SELECT * FROM queue_items WHERE queue_id = ?').all(queueId) as any[];
        itemsToRender = dbItems.map((it) => ({
          id: it.id,
          sku: it.sku_code,
          title: it.title,
          xCm: it.x_cm,
          yCm: it.y_cm,
          widthCm: it.width_cm,
          heightCm: it.height_cm,
          rotated: it.rotated === 1,
          rotation: it.rotation || (it.rotated ? 90 : 0),
          imagePath: it.image_path,
          garmentInfo: it.garment_info,
        }));
      } else {
        return NextResponse.json({ error: 'Fila não encontrada ou acesso não autorizado' }, { status: 404 });
      }
    }

    if (!itemsToRender || itemsToRender.length === 0) {
      return NextResponse.json({ error: 'Nenhum item informado para renderizar' }, { status: 400 });
    }

    const result = await renderHighResDTFQueue(
      effectiveQueueId,
      targetWidth,
      targetHeight,
      itemsToRender,
      userId
    );

    if (queueId) {
      try {
        db.prepare('UPDATE print_queues SET highres_image_path = ? WHERE id = ? AND user_id = ?').run(result.publicUrl, queueId, userId);
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      downloadUrl: result.publicUrl,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
    });
  } catch (err: any) {
    console.error('Error rendering highres queue:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
