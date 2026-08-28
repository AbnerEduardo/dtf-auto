const fs = require('fs');
const path = require('path');

function writeFile(relPath, content) {
  const full = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('✓ Generated API:', relPath);
}

// ----------------------------------------------------
// 1. src/app/api/auth/route.ts
// ----------------------------------------------------
writeFile('src/app/api/auth/route.ts', `import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  // Default session user
  const user = db.prepare('SELECT id, name, email, company FROM users LIMIT 1').get();
  const sub = user ? db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get((user as any).id) : null;
  return NextResponse.json({ user, subscription: sub });
}

export async function POST(request: Request) {
  try {
    const { action, email, password, name, company } = await request.json();

    if (action === 'register') {
      const id = 'user_' + Date.now();
      db.prepare(\`
        INSERT INTO users (id, name, email, password, company)
        VALUES (?, ?, ?, ?, ?)
      \`).run(id, name || 'Estamparia DTF', email, password, company || '');

      db.prepare(\`
        INSERT INTO subscriptions (id, user_id, status, plan_name, price_monthly, current_period_end)
        VALUES (?, ?, 'active', 'Plano Pro DTF Auto', 65.00, datetime('now', '+30 days'))
      \`).run('sub_' + Date.now(), id);

      const user = db.prepare('SELECT id, name, email, company FROM users WHERE id = ?').get(id);
      return NextResponse.json({ success: true, user });
    }

    // Action === 'login'
    const user = db.prepare('SELECT id, name, email, company FROM users WHERE email = ? AND password = ?').get(email, password);
    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 });
    }

    const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get((user as any).id);
    return NextResponse.json({ success: true, user, subscription: sub });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`);

// ----------------------------------------------------
// 2. src/app/api/skus/route.ts & [id]/route.ts
// ----------------------------------------------------
writeFile('src/app/api/skus/route.ts', `import { NextResponse } from 'next/server';
import db from '@/lib/db';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export async function GET() {
  const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
  const userId = user?.id || 'user_demo_01';
  const skus = db.prepare('SELECT * FROM skus WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return NextResponse.json({ skus });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const skuCode = String(formData.get('sku') || '').trim().toUpperCase();
    const title = String(formData.get('title') || '').trim();
    const widthCm = parseFloat(String(formData.get('width_cm') || '30'));
    const heightCm = parseFloat(String(formData.get('height_cm') || '30'));
    const file = formData.get('image') as File | null;

    if (!skuCode || !title || !widthCm || !heightCm) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
    const userId = user?.id || 'user_demo_01';

    let imagePath = '/samples/boston.png';
    let originalWPx = Math.round(widthCm * 118.11);
    let originalHPx = Math.round(heightCm * 118.11);
    let dpiCalculated = 300.0;
    let hasTransparency = 1;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filename = \`sku-\${skuCode.toLowerCase()}-\${Date.now()}.png\`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'arts');
      fs.mkdirSync(uploadDir, { recursive: true });
      const destPath = path.join(uploadDir, filename);

      // Analyze image via Sharp
      const metadata = await sharp(buffer).metadata();
      originalWPx = metadata.width || originalWPx;
      originalHPx = metadata.height || originalHPx;
      hasTransparency = metadata.hasAlpha ? 1 : 0;

      // Calculate real DPI for the requested physical size
      const dpiX = (originalWPx / widthCm) * 2.54;
      const dpiY = (originalHPx / heightCm) * 2.54;
      dpiCalculated = Number(Math.min(dpiX, dpiY).toFixed(1));

      // Save processed file
      await sharp(buffer).png().toFile(destPath);
      imagePath = \`/uploads/arts/\${filename}\`;
    }

    const id = 'sku_' + Date.now();
    db.prepare(\`
      INSERT INTO skus (id, user_id, sku, title, image_path, width_cm, height_cm, original_width_px, original_height_px, dpi_calculated, has_transparency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(id, userId, skuCode, title, imagePath, widthCm, heightCm, originalWPx, originalHPx, dpiCalculated, hasTransparency);

    const createdSku = db.prepare('SELECT * FROM skus WHERE id = ?').get(id);
    return NextResponse.json({ success: true, sku: createdSku });
  } catch (err: any) {
    console.error('Error saving SKU:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`);

writeFile('src/app/api/skus/[id]/route.ts', `import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    db.prepare('DELETE FROM skus WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`);

// ----------------------------------------------------
// 3. src/app/api/orders/parse/route.ts
// ----------------------------------------------------
writeFile('src/app/api/orders/parse/route.ts', `import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { parseExcelOrderFile, parseTextOrPdfOrders, buildGarmentPickingSummary, ParsedOrderItem } from '@/lib/orderParser';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const manualText = String(formData.get('manualText') || '').trim();

    let parsedItems: ParsedOrderItem[] = [];
    let filename = 'manual_input.txt';

    if (file && file.size > 0) {
      filename = file.name;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        parsedItems = parseExcelOrderFile(buffer);
      } else if (file.name.endsWith('.pdf')) {
        // Simple PDF text extraction or text stream
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        parsedItems = parseTextOrPdfOrders(pdfData.text);
      } else {
        const text = buffer.toString('utf8');
        parsedItems = parseTextOrPdfOrders(text);
      }
    } else if (manualText) {
      parsedItems = parseTextOrPdfOrders(manualText);
    } else {
      // Return realistic mock sample if empty
      parsedItems = [
        { sku: 'CAM001', productTitle: 'Camiseta Boston Masculina Algodão Preta G', quantity: 5, garmentType: 'Camiseta Tradicional', color: 'Preto', size: 'G' },
        { sku: 'CAM002', productTitle: 'Moletom Canguru Spider Hero Preto M', quantity: 3, garmentType: 'Moletom Canguru', color: 'Preto', size: 'M' },
        { sku: 'CAM003', productTitle: 'Babylook Flores Vintage Mescla P', quantity: 4, garmentType: 'Babylook', color: 'Cinza Mescla', size: 'P' },
        { sku: 'CAM004', productTitle: 'Camiseta Naruto Anime Infantil Branca 08', quantity: 2, garmentType: 'Linha Infantil', color: 'Branco', size: 'Tam 08' },
      ];
    }

    // Match with user registered SKUs
    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
    const userId = user?.id || 'user_demo_01';
    const allSkus = db.prepare('SELECT * FROM skus WHERE user_id = ?').all(userId) as any[];
    const skuMap = new Map(allSkus.map((s) => [s.sku.toUpperCase(), s]));

    const enrichedItems = parsedItems.map((item) => {
      const matched = skuMap.get(item.sku.toUpperCase());
      return {
        ...item,
        isRegistered: !!matched,
        skuId: matched?.id || null,
        title: matched?.title || item.productTitle,
        widthCm: matched?.width_cm || 30.0,
        heightCm: matched?.height_cm || 25.0,
        imagePath: matched?.image_path || '/samples/boston.png',
        hasTransparency: matched?.has_transparency ?? 1,
      };
    });

    const pickingSummary = buildGarmentPickingSummary(parsedItems);
    const totalPieces = parsedItems.reduce((acc, it) => acc + it.quantity, 0);

    return NextResponse.json({
      success: true,
      filename,
      totalPieces,
      items: enrichedItems,
      pickingSummary,
    });
  } catch (err: any) {
    console.error('Error parsing orders:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`);

// ----------------------------------------------------
// 4. src/app/api/queue/generate/route.ts & render-300dpi/route.ts
// ----------------------------------------------------
writeFile('src/app/api/queue/generate/route.ts', `import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { computeDTFNesting, NestingInputItem } from '@/lib/nesting';

export async function POST(request: Request) {
  try {
    const {
      items,
      rollWidthCm = 59.0,
      marginCm = 1.0,
      spacingCm = 1.0,
      allowRotation = true,
      name = 'Fila DTF de Produção',
    } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Nenhum item informado para montar a fila' }, { status: 400 });
    }

    // Multiply items by their quantities
    const flatItems: NestingInputItem[] = [];
    items.forEach((it: any) => {
      const qty = it.quantity || 1;
      for (let i = 0; i < qty; i++) {
        flatItems.push({
          id: \`\${it.sku}_\${i + 1}_\${Math.random().toString(36).substring(2, 7)}\`,
          sku: it.sku,
          title: it.title || it.productTitle || it.sku,
          widthCm: parseFloat(it.widthCm || '30'),
          heightCm: parseFloat(it.heightCm || '25'),
          imagePath: it.imagePath || '/samples/boston.png',
          garmentInfo: \`\${it.garmentType || 'Peça'} \${it.color || ''} \${it.size || ''}\`.trim(),
        });
      }
    });

    const nesting = computeDTFNesting(flatItems, rollWidthCm, marginCm, spacingCm, allowRotation);

    const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
    const userId = user?.id || 'user_demo_01';
    const queueId = 'queue_' + Date.now();

    db.prepare(\`
      INSERT INTO print_queues (
        id, user_id, name, roll_width_cm, roll_height_cm, margin_cm, spacing_cm,
        allow_rotation, total_items, efficiency_percent, estimated_savings_brl, saved_linear_cm
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(
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

    const insertItem = db.prepare(\`
      INSERT INTO queue_items (id, queue_id, sku_id, sku_code, title, x_cm, y_cm, width_cm, height_cm, rotated, image_path, garment_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`);

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
`);

writeFile('src/app/api/queue/render-300dpi/route.ts', `import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { renderHighResDTFQueue } from '@/lib/imageComposer';

export async function POST(request: Request) {
  try {
    const { queueId } = await request.json();

    if (!queueId) {
      return NextResponse.json({ error: 'ID da fila não informado' }, { status: 400 });
    }

    const queue = db.prepare('SELECT * FROM print_queues WHERE id = ?').get(queueId) as any;
    if (!queue) {
      return NextResponse.json({ error: 'Fila não encontrada' }, { status: 404 });
    }

    const items = db.prepare('SELECT * FROM queue_items WHERE queue_id = ?').all(queueId) as any[];
    const placedItems = items.map((it) => ({
      id: it.id,
      sku: it.sku_code,
      title: it.title,
      xCm: it.x_cm,
      yCm: it.y_cm,
      widthCm: it.width_cm,
      heightCm: it.height_cm,
      rotated: it.rotated === 1,
      imagePath: it.image_path,
      garmentInfo: it.garment_info,
    }));

    const result = await renderHighResDTFQueue(
      queueId,
      queue.roll_width_cm,
      queue.roll_height_cm,
      placedItems
    );

    db.prepare('UPDATE print_queues SET highres_image_path = ? WHERE id = ?').run(result.publicUrl, queueId);

    return NextResponse.json({
      success: true,
      downloadUrl: result.publicUrl,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
    });
  } catch (err: any) {
    console.error('Error rendering 300 DPI queue:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`);

writeFile('src/app/api/queues/route.ts', `import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
  const userId = user?.id || 'user_demo_01';
  const queues = db.prepare('SELECT * FROM print_queues WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return NextResponse.json({ queues });
}
`);

// ----------------------------------------------------
// 5. src/app/api/subscription/route.ts
// ----------------------------------------------------
writeFile('src/app/api/subscription/route.ts', `import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
  const userId = user?.id || 'user_demo_01';
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  
  // PIX Copia e Cola mock payload
  const pixCode = '00020126580014br.gov.bcb.pix0136e9181408-7a53-4da8-9848-680b6fb55d86520400005303986540565.005802BR5925DTF AUTO SAAS TECNOLOGIA6009SAO PAULO62070503***6304E8A2';

  return NextResponse.json({
    subscription: sub || {
      status: 'active',
      plan_name: 'Plano Pro DTF Auto',
      price_monthly: 65.00,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    pixCode,
  });
}

export async function POST(request: Request) {
  const { action } = await request.json();
  const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
  const userId = user?.id || 'user_demo_01';

  if (action === 'renew' || action === 'activate') {
    db.prepare(\`
      UPDATE subscriptions 
      SET status = 'active', current_period_end = datetime('now', '+30 days')
      WHERE user_id = ?
    return NextResponse.json({ success: true, message: 'Assinatura renovada com sucesso!' });
  }

  return NextResponse.json({ success: true });
}
`);


console.log('🎉 All API routes generated successfully!');