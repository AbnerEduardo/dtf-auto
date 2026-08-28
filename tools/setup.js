const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function writeFile(relPath, content) {
  const full = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('✓ Generated:', relPath);
}

// ----------------------------------------------------
// 1. src/lib/db.ts
// ----------------------------------------------------
writeFile('src/lib/db.ts', `import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dtf_auto.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Ensure tables exist
db.exec(\`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    company TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    plan_name TEXT NOT NULL DEFAULT 'Plano Pro DTF Auto',
    price_monthly REAL NOT NULL DEFAULT 65.00,
    trial_ends_at DATETIME,
    current_period_end DATETIME,
    pix_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS skus (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sku TEXT NOT NULL,
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
    roll_width_cm REAL NOT NULL DEFAULT 59.0,
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
\`);

// Seed default user and standard test SKUs if empty
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
if (userCount.c === 0) {
  const defaultUserId = 'user_demo_01';
  db.prepare(\`
    INSERT INTO users (id, name, email, password, company)
    VALUES (?, ?, ?, ?, ?)
  \`).run(defaultUserId, 'Estamparia Personalizados Brasil', 'demo@dtfauto.com.br', '123456', 'Personalizados & Cia');

  db.prepare(\`
    INSERT INTO subscriptions (id, user_id, status, plan_name, price_monthly, current_period_end)
    VALUES (?, ?, 'active', 'Plano Pro DTF Auto', 65.00, datetime('now', '+30 days'))
  \`).run('sub_demo_01', defaultUserId);

  const starterSkus = [
    { id: 'sku_01', sku: 'CAM001', title: 'Boston Athletics Verde', image_path: '/samples/boston.png', width_cm: 30.0, height_cm: 25.0, dpi: 300, transparent: 1 },
    { id: 'sku_02', sku: 'CAM002', title: 'Spider Urban Hero', image_path: '/samples/spider.png', width_cm: 28.0, height_cm: 30.0, dpi: 300, transparent: 1 },
    { id: 'sku_03', sku: 'CAM003', title: 'Flores Botanical Vintage', image_path: '/samples/flores.png', width_cm: 20.0, height_cm: 15.0, dpi: 300, transparent: 1 },
    { id: 'sku_04', sku: 'CAM004', title: 'Naruto Shippuden Anime', image_path: '/samples/naruto.png', width_cm: 35.0, height_cm: 30.0, dpi: 300, transparent: 1 },
  ];

  const insertSku = db.prepare(\`
    INSERT INTO skus (id, user_id, sku, title, image_path, width_cm, height_cm, original_width_px, original_height_px, dpi_calculated, has_transparency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`);

  for (const s of starterSkus) {
    insertSku.run(s.id, defaultUserId, s.sku, s.title, s.image_path, s.width_cm, s.height_cm, Math.round(s.width_cm * 118.11), Math.round(s.height_cm * 118.11), s.dpi, s.transparent);
  }
}

export default db;
`);

// ----------------------------------------------------
// 2. src/lib/nesting.ts (2D Nesting Algorithm)
// ----------------------------------------------------
writeFile('src/lib/nesting.ts', `export interface NestingInputItem {
  id: string;
  sku: string;
  title: string;
  widthCm: number;
  heightCm: number;
  imagePath: string;
  garmentInfo?: string;
}

export interface PlacedItem {
  id: string;
  sku: string;
  title: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
  rotated: boolean;
  imagePath: string;
  garmentInfo?: string;
}

export interface NestingResult {
  rollWidthCm: number;
  rollHeightCm: number;
  efficiencyPercent: number;
  totalArtAreaCm2: number;
  linearSavingsCm: number;
  estimatedSavingsBrl: number;
  placedItems: PlacedItem[];
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeDTFNesting(
  items: NestingInputItem[],
  rollWidthCm = 59.0,
  marginCm = 1.0,
  spacingCm = 1.0,
  allowRotation = true
): NestingResult {
  if (!items || items.length === 0) {
    return {
      rollWidthCm,
      rollHeightCm: 0,
      efficiencyPercent: 0,
      totalArtAreaCm2: 0,
      linearSavingsCm: 0,
      estimatedSavingsBrl: 0,
      placedItems: [],
    };
  }

  const usableWidth = rollWidthCm - 2 * marginCm;
  const gap = spacingCm;

  // Calculate total art area
  let totalArtAreaCm2 = 0;
  let naiveHeightCm = marginCm;

  items.forEach((it) => {
    totalArtAreaCm2 += it.widthCm * it.heightCm;
    naiveHeightCm += it.heightCm + gap;
  });

  // Sort strategies for best nesting fit
  const sortStrategies = [
    (a: NestingInputItem, b: NestingInputItem) => Math.max(b.widthCm, b.heightCm) - Math.max(a.widthCm, a.heightCm), // Max dimension
    (a: NestingInputItem, b: NestingInputItem) => b.heightCm * b.widthCm - a.heightCm * a.widthCm, // Area desc
    (a: NestingInputItem, b: NestingInputItem) => b.heightCm - a.heightCm, // Height desc
    (a: NestingInputItem, b: NestingInputItem) => b.widthCm - a.widthCm, // Width desc
  ];

  let bestResult: { placed: PlacedItem[]; maxBottom: number } | null = null;

  for (const sortFn of sortStrategies) {
    const sorted = [...items].sort(sortFn);
    const result = runMaxRectsPacker(sorted, usableWidth, marginCm, gap, allowRotation);
    if (!bestResult || result.maxBottom < bestResult.maxBottom) {
      bestResult = result;
    }
  }

  const finalHeightCm = Number((bestResult!.maxBottom + marginCm).toFixed(1));
  const totalRollAreaCm2 = rollWidthCm * finalHeightCm;
  const efficiencyPercent = totalRollAreaCm2 > 0 ? Number(((totalArtAreaCm2 / totalRollAreaCm2) * 100).toFixed(1)) : 0;
  
  const linearSavingsCm = Math.max(0, Number((naiveHeightCm - finalHeightCm).toFixed(1)));
  // Average DTF price in Brazil: R$ 45,00/metro linear (R$ 0.45/cm)
  const estimatedSavingsBrl = Number(((linearSavingsCm / 100) * 45.0).toFixed(2));

  return {
    rollWidthCm,
    rollHeightCm: finalHeightCm,
    efficiencyPercent,
    totalArtAreaCm2: Number(totalArtAreaCm2.toFixed(1)),
    linearSavingsCm,
    estimatedSavingsBrl,
    placedItems: bestResult!.placed,
  };
}

function runMaxRectsPacker(
  items: NestingInputItem[],
  usableWidth: number,
  margin: number,
  gap: number,
  allowRotation: boolean
): { placed: PlacedItem[]; maxBottom: number } {
  // Free rectangles list (Guillotine / MaxRects)
  const freeRects: FreeRect[] = [{ x: margin, y: margin, w: usableWidth, h: 100000 }];
  const placed: PlacedItem[] = [];
  let maxBottom = margin;

  for (const item of items) {
    let bestScore = Infinity;
    let bestRectIdx = -1;
    let bestRotated = false;
    let bestW = item.widthCm;
    let bestH = item.heightCm;

    const orientations = [{ w: item.widthCm, h: item.heightCm, rotated: false }];
    if (allowRotation && item.widthCm !== item.heightCm) {
      orientations.push({ w: item.heightCm, h: item.widthCm, rotated: true });
    }

    for (let r = 0; r < freeRects.length; r++) {
      const fr = freeRects[r];
      for (const orient of orientations) {
        const itemWWithGap = orient.w;
        const itemHWithGap = orient.h;

        if (fr.w >= itemWWithGap && fr.h >= itemHWithGap) {
          // BSSF (Best Short Side Fit) heuristic prioritizing lower Y (horizontal filling)
          const leftoverX = fr.w - itemWWithGap;
          const leftoverY = fr.h - itemHWithGap;
          const shortSideFit = Math.min(leftoverX, leftoverY);
          
          // Weight Y heavily to pack bottom-first and side-by-side
          const score = fr.y * 1000 + shortSideFit;

          if (score < bestScore) {
            bestScore = score;
            bestRectIdx = r;
            bestRotated = orient.rotated;
            bestW = orient.w;
            bestH = orient.h;
          }
        }
      }
    }

    if (bestRectIdx >= 0) {
      const chosenFr = freeRects[bestRectIdx];
      const posX = chosenFr.x;
      const posY = chosenFr.y;

      placed.push({
        id: item.id,
        sku: item.sku,
        title: item.title,
        xCm: Number(posX.toFixed(2)),
        yCm: Number(posY.toFixed(2)),
        widthCm: Number(bestW.toFixed(2)),
        heightCm: Number(bestH.toFixed(2)),
        rotated: bestRotated,
        imagePath: item.imagePath,
        garmentInfo: item.garmentInfo,
      });

      const placedBottom = posY + bestH;
      if (placedBottom > maxBottom) {
        maxBottom = placedBottom;
      }

      // Split the chosen rectangle
      const occupiedW = bestW + gap;
      const occupiedH = bestH + gap;

      // Generate new free rects from splitting
      const newRects: FreeRect[] = [];
      for (let i = freeRects.length - 1; i >= 0; i--) {
        const r = freeRects[i];
        if (
          posX < r.x + r.w &&
          posX + occupiedW > r.x &&
          posY < r.y + r.h &&
          posY + occupiedH > r.y
        ) {
          // Overlaps, split into 4 possible sub-rectangles
          // 1. Right sub-rect
          if (posX + occupiedW < r.x + r.w) {
            newRects.push({
              x: posX + occupiedW,
              y: r.y,
              w: r.x + r.w - (posX + occupiedW),
              h: r.h,
            });
          }
          // 2. Left sub-rect
          if (posX > r.x) {
            newRects.push({
              x: r.x,
              y: r.y,
              w: posX - r.x,
              h: r.h,
            });
          }
          // 3. Top sub-rect
          if (posY > r.y) {
            newRects.push({
              x: r.x,
              y: r.y,
              w: r.w,
              h: posY - r.y,
            });
          }
          // 4. Bottom sub-rect
          if (posY + occupiedH < r.y + r.h) {
            newRects.push({
              x: r.x,
              y: posY + occupiedH,
              w: r.w,
              h: r.y + r.h - (posY + occupiedH),
            });
          }
          freeRects.splice(i, 1);
        }
      }

      // Add valid new rects
      for (const nr of newRects) {
        if (nr.w >= 1 && nr.h >= 1) {
          freeRects.push(nr);
        }
      }

      // Filter redundant or enclosed rects
      for (let a = freeRects.length - 1; a >= 0; a--) {
        for (let b = 0; b < freeRects.length; b++) {
          if (a !== b) {
            const ra = freeRects[a];
            const rb = freeRects[b];
            if (
              ra.x >= rb.x &&
              ra.y >= rb.y &&
              ra.x + ra.w <= rb.x + rb.w &&
              ra.y + ra.h <= rb.y + rb.h
            ) {
              freeRects.splice(a, 1);
              break;
            }
          }
        }
      }
    }
  }

  return { placed, maxBottom };
}
`);

// ----------------------------------------------------
// 3. src/lib/imageComposer.ts (300 DPI Transparent Rendering)
// ----------------------------------------------------
writeFile('src/lib/imageComposer.ts', `import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { PlacedItem } from './nesting';

// 300 DPI Math: 1 cm = 300 / 2.54 = 118.110236 px
export const DPI_300_PPCM = 300 / 2.54;

export async function renderHighResDTFQueue(
  queueId: string,
  rollWidthCm: number,
  rollHeightCm: number,
  placedItems: PlacedItem[]
): Promise<{ filePath: string; publicUrl: string; widthPx: number; heightPx: number }> {
  const widthPx = Math.round(rollWidthCm * DPI_300_PPCM);
  const heightPx = Math.round(rollHeightCm * DPI_300_PPCM);

  const outFilename = \`queue-\${queueId}-300dpi.png\`;
  const outDir = path.join(process.cwd(), 'public', 'uploads', 'queues');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, outFilename);

  // Prepare composite overlays
  const composites: sharp.OverlayOptions[] = [];

  for (const item of placedItems) {
    const leftPx = Math.round(item.xCm * DPI_300_PPCM);
    const topPx = Math.round(item.yCm * DPI_300_PPCM);
    const targetWPx = Math.round(item.widthCm * DPI_300_PPCM);
    const targetHPx = Math.round(item.heightCm * DPI_300_PPCM);

    // Resolve image file path
    let imgAbsPath = '';
    if (item.imagePath.startsWith('/')) {
      imgAbsPath = path.join(process.cwd(), 'public', item.imagePath.slice(1));
    } else {
      imgAbsPath = path.join(process.cwd(), 'public', item.imagePath);
    }

    if (fs.existsSync(imgAbsPath)) {
      try {
        let pipeline = sharp(imgAbsPath);
        
        if (item.rotated) {
          pipeline = pipeline.rotate(90);
        }

        // Resize with alpha channel preservation
        const resizedBuffer = await pipeline
          .resize(targetWPx, targetHPx, { fit: 'fill' })
          .ensureAlpha()
          .toBuffer();

        composites.push({
          input: resizedBuffer,
          left: Math.max(0, leftPx),
          top: Math.max(0, topPx),
        });
      } catch (err) {
        console.error('Error processing item image:', item.sku, err);
      }
    }
  }

  // Create base 100% transparent 4-channel Alpha canvas
  await sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toFile(outPath);

  return {
    filePath: outPath,
    publicUrl: \`/uploads/queues/\${outFilename}\`,
    widthPx,
    heightPx,
  };
}
`);

// ----------------------------------------------------
// 4. src/lib/orderParser.ts (PDF, Excel & Garment Classifier)
// ----------------------------------------------------
writeFile('src/lib/orderParser.ts', `import * as XLSX from 'xlsx';

export interface ParsedOrderItem {
  sku: string;
  productTitle: string;
  quantity: number;
  garmentType: string;
  color: string;
  size: string;
}

export interface GarmentSummaryGroup {
  garmentType: string;
  totalPieces: number;
  colors: {
    colorName: string;
    sizes: {
      sizeName: string;
      quantity: number;
      skus: { sku: string; quantity: number }[];
    }[];
  }[];
}

export function classifyGarment(rawTitle: string, rawSku: string): {
  garmentType: string;
  color: string;
  size: string;
} {
  const combined = \`\${rawTitle} \${rawSku}\`.toLowerCase();

  // 1. Detect Garment Type
  let garmentType = 'Camiseta Tradicional';
  if (/canguru|hoodie|capuz|moletom canguru/i.test(combined)) {
    garmentType = 'Moletom Canguru';
  } else if (/careca|gola redonda|moletom careca/i.test(combined)) {
    garmentType = 'Moletom Careca';
  } else if (/oversized|streetwear/i.test(combined)) {
    garmentType = 'Camiseta Oversized';
  } else if (/babylook|baby look|feminina/i.test(combined)) {
    garmentType = 'Babylook';
  } else if (/regata|machao|machão/i.test(combined)) {
    garmentType = 'Regata';
  } else if (/infantil|kids|juvenil|body/i.test(combined)) {
    garmentType = 'Linha Infantil';
  } else if (/cropped/i.test(combined)) {
    garmentType = 'Cropped';
  }

  // 2. Detect Color
  let color = 'Preto';
  if (/branco|white|off-white|off white/i.test(combined)) {
    color = /off-white|off white/i.test(combined) ? 'Off-White' : 'Branco';
  } else if (/mescla|cinza mescla|cinza/i.test(combined)) {
    color = 'Cinza Mescla';
  } else if (/marinho|azul marinho|navy/i.test(combined)) {
    color = 'Azul Marinho';
  } else if (/royal|azul royal/i.test(combined)) {
    color = 'Azul Royal';
  } else if (/vermelho|red|vinho|bordeaux/i.test(combined)) {
    color = /vinho|bordeaux/i.test(combined) ? 'Vinho / Bordô' : 'Vermelho';
  } else if (/militar|verde militar|verde/i.test(combined)) {
    color = 'Verde Militar';
  } else if (/bege|areia|nude/i.test(combined)) {
    color = 'Bege Areia';
  } else if (/amarelo|yellow/i.test(combined)) {
    color = 'Amarelo';
  } else if (/rosa|pink/i.test(combined)) {
    color = 'Rosa';
  }

  // 3. Detect Size
  let size = 'G';
  // Check kids size numbers
  const kidsMatch = combined.match(/\\b(02|04|06|08|10|12|14|16|2|4|6|8)\\b/);
  if (kidsMatch && (garmentType === 'Linha Infantil' || /tam|tamanho|ano/i.test(combined))) {
    size = \`Tam \${kidsMatch[1].padStart(2, '0')}\`;
  } else if (/\\b(g1|g2|g3|exg|xg|xxl)\\b/i.test(combined)) {
    size = 'XG / Plus';
  } else if (/\\b(gg|xl)\\b/i.test(combined)) {
    size = 'GG';
  } else if (/\\b(pp|xs)\\b/i.test(combined)) {
    size = 'PP';
  } else if (/\\b(p|s|pequeno)\\b/i.test(combined)) {
    size = 'P';
  } else if (/\\b(m|medio|médio)\\b/i.test(combined)) {
    size = 'M';
  } else if (/\\b(g|grande|l)\\b/i.test(combined)) {
    size = 'G';
  }

  return { garmentType, color, size };
}

export function parseExcelOrderFile(buffer: Buffer): ParsedOrderItem[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rawRows || rawRows.length === 0) return [];

  // Find column indices
  let skuCol = -1;
  let titleCol = -1;
  let qtyCol = -1;

  let startRowIdx = 0;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r];
    if (Array.isArray(row)) {
      row.forEach((cell, c) => {
        const text = String(cell || '').toLowerCase();
        if (/sku|código|codigo/i.test(text) && skuCol === -1) skuCol = c;
        if (/produto|título|titulo|nome|descrição/i.test(text) && titleCol === -1) titleCol = c;
        if (/qtd|quantidade|quant|qnt/i.test(text) && qtyCol === -1) qtyCol = c;
      });
      if (skuCol !== -1 || titleCol !== -1) {
        startRowIdx = r + 1;
        break;
      }
    }
  }

  // Fallbacks if header wasn't labeled
  if (skuCol === -1) skuCol = 0;
  if (titleCol === -1) titleCol = 1;
  if (qtyCol === -1) qtyCol = 2;

  const parsedItems: ParsedOrderItem[] = [];

  for (let i = startRowIdx; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawSku = String(row[skuCol] || '').trim();
    const rawTitle = String(row[titleCol] || '').trim();
    const rawQty = parseInt(String(row[qtyCol] || '1').replace(/\\D/g, ''), 10) || 1;

    if (!rawSku && !rawTitle) continue;

    const cleanSku = (rawSku || rawTitle).split(/[-_\\s]/)[0].toUpperCase();
    const { garmentType, color, size } = classifyGarment(rawTitle, rawSku);

    parsedItems.push({
      sku: cleanSku,
      productTitle: rawTitle || rawSku,
      quantity: rawQty,
      garmentType,
      color,
      size,
    });
  }

  return parsedItems;
}

export function parseTextOrPdfOrders(text: string): ParsedOrderItem[] {
  const lines = text.split('\\n');
  const items: ParsedOrderItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /código|quantidade|upseller|resumo|página|total/i.test(trimmed)) continue;

    // Pattern: SKU / Title / Qty
    // e.g. "CAM001 Camiseta Boston Masculina Preta G 5" or "CAM001 - 5" or "CAM002 3"
    const matchQty = trimmed.match(/(\\d+)\\s*$/);
    const qty = matchQty ? parseInt(matchQty[1], 10) : 1;
    const content = matchQty ? trimmed.slice(0, matchQty.index).trim() : trimmed;

    const parts = content.split(/\\s{2,}|\\t| - /);
    const skuPart = parts[0] ? parts[0].trim().toUpperCase() : 'SKU-ITEM';
    const titlePart = parts[1] ? parts[1].trim() : content;

    const cleanSku = skuPart.split(/[-_\\s]/)[0].toUpperCase();
    const { garmentType, color, size } = classifyGarment(titlePart, skuPart);

    items.push({
      sku: cleanSku,
      productTitle: titlePart || skuPart,
      quantity: qty,
      garmentType,
      color,
      size,
    });
  }

  return items;
}

export function buildGarmentPickingSummary(items: ParsedOrderItem[]): GarmentSummaryGroup[] {
  const groupsMap = new Map<string, Map<string, Map<string, { total: number; skus: Map<string, number> }>>>();

  for (const item of items) {
    if (!groupsMap.has(item.garmentType)) {
      groupsMap.set(item.garmentType, new Map());
    }
    const colorMap = groupsMap.get(item.garmentType)!;

    if (!colorMap.has(item.color)) {
      colorMap.set(item.color, new Map());
    }
    const sizeMap = colorMap.get(item.color)!;

    if (!sizeMap.has(item.size)) {
      sizeMap.set(item.size, { total: 0, skus: new Map() });
    }
    const sizeObj = sizeMap.get(item.size)!;
    sizeObj.total += item.quantity;
    sizeObj.skus.set(item.sku, (sizeObj.skus.get(item.sku) || 0) + item.quantity);
  }

  const result: GarmentSummaryGroup[] = [];

  groupsMap.forEach((colorsMap, garmentType) => {
    let totalPiecesForGarment = 0;
    const colorsList: any[] = [];

    colorsMap.forEach((sizesMap, colorName) => {
      const sizesList: any[] = [];

      sizesMap.forEach((sizeData, sizeName) => {
        totalPiecesForGarment += sizeData.total;
        const skusList: { sku: string; quantity: number }[] = [];
        sizeData.skus.forEach((q, s) => skusList.push({ sku: s, quantity: q }));

        sizesList.push({
          sizeName,
          quantity: sizeData.total,
          skus: skusList,
        });
      });

      colorsList.push({
        colorName,
        sizes: sizesList,
      });
    });

    result.push({
      garmentType,
      totalPieces: totalPiecesForGarment,
      colors: colorsList,
    });
  });

  return result;
}
`);

console.log('✓ Core libraries written successfully');