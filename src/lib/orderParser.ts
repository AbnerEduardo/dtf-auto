import * as XLSX from 'xlsx';

export interface ParsedOrderItem {
  sku: string;
  rawSku?: string;
  orderNum?: string;
  productTitle: string;
  variation?: string;
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

export function classifyGarment(rawTitle: string, rawVariation: string): {
  garmentType: string;
  color: string;
  size: string;
  cleanSku: string;
} {
  const combined = `${rawTitle} ${rawVariation}`.toLowerCase();
  const variationClean = rawVariation.toLowerCase();

  // 1. Extract Size First (Crucial for correct category classification)
  let size = 'G';
  let isKids = false;
  let isPlusSize = false;

  // Check variation part after comma first, e.g. "(Docinho Preto,G1)" or "(Preto,16)" or "(Bege,8)"
  const varParts = rawVariation.split(',');
  const sizePart = (varParts[1] || varParts[0] || '').trim().toUpperCase();

  if (/^(02|04|06|08|10|12|14|16|2|4|6|8)$/.test(sizePart)) {
    size = sizePart;
    isKids = true;
  } else if (/^(G1|G2|G3|G4|G5|XG|EXG|XXL)$/.test(sizePart)) {
    size = sizePart;
    isPlusSize = true;
  } else if (/^(PP|P|M|G|GG)$/.test(sizePart)) {
    size = sizePart;
  } else {
    // Check in combined text
    const kidsMatch = combined.match(/\b(02|04|06|08|10|12|14|16|2|4|6|8)\b/);
    if (kidsMatch && (/infantil|kids|juvenil|tam|tamanho|ano/i.test(combined) || /^\d+$/.test(kidsMatch[1]))) {
      size = kidsMatch[1];
      isKids = true;
    } else if (/\b(g1)\b/i.test(combined)) {
      size = 'G1';
      isPlusSize = true;
    } else if (/\b(g2)\b/i.test(combined)) {
      size = 'G2';
      isPlusSize = true;
    } else if (/\b(g3)\b/i.test(combined)) {
      size = 'G3';
      isPlusSize = true;
    } else if (/\b(gg|xl)\b/i.test(combined)) {
      size = 'GG';
    } else if (/\b(pp|xs)\b/i.test(combined)) {
      size = 'PP';
    } else if (/\b(p|s|pequeno)\b/i.test(combined)) {
      size = 'P';
    } else if (/\b(m|medio|médio)\b/i.test(combined)) {
      size = 'M';
    } else if (/\b(g|grande|l)\b/i.test(combined)) {
      size = 'G';
    }
  }

  // 2. Detect Base Garment Type
  let baseType = 'Camiseta';
  if (/canguru|hoodie|capuz|moletom/i.test(combined)) {
    baseType = 'Moletom Canguru';
  } else if (/careca|gola redonda|moletom careca/i.test(combined)) {
    baseType = 'Moletom Careca';
  } else if (/babylook|baby look/i.test(combined)) {
    baseType = 'Babylook';
  } else if (/regata|machao|machão/i.test(combined)) {
    baseType = 'Regata';
  } else if (/cropped/i.test(combined)) {
    baseType = 'Cropped';
  }

  // 3. Form Final Category Name Strictly by Size Grade:
  // - P ao GG -> Tradicional
  // - G1 ao G3 -> Plus Size
  // - 2 ao 16 -> Infantil
  let garmentType = 'Camiseta Tradicional';
  if (baseType === 'Camiseta') {
    if (isKids) {
      garmentType = 'Camiseta Infantil';
    } else if (isPlusSize) {
      garmentType = 'Camiseta Plus Size';
    } else {
      garmentType = 'Camiseta Tradicional';
    }
  } else if (baseType.includes('Moletom')) {
    if (isKids) {
      garmentType = `${baseType} Infantil`;
    } else if (isPlusSize) {
      garmentType = `${baseType} Plus Size`;
    } else {
      garmentType = baseType;
    }
  } else {
    garmentType = baseType;
  }

  // 4. Detect Color
  let color = 'Preto';
  if (/branco/i.test(combined)) {
    color = 'Branco';
  } else if (/bege|areia|nude/i.test(combined)) {
    color = 'Bege Areia';
  } else if (/mescla|cinza mescla|cinza/i.test(combined)) {
    color = 'Cinza Mescla';
  } else if (/marinho|azul marinho|navy/i.test(combined)) {
    color = 'Azul Marinho';
  } else if (/royal|azul royal/i.test(combined)) {
    color = 'Azul Royal';
  } else if (/vermelho|red|vinho|bordeaux/i.test(combined)) {
    color = /vinho|bordeaux/i.test(combined) ? 'Vinho / Bordô' : 'Vermelho';
  } else if (/militar|verde militar|verde/i.test(combined)) {
    color = 'Verde';
  } else if (/amarelo|yellow/i.test(combined)) {
    color = 'Amarelo';
  } else if (/rosa|pink/i.test(combined)) {
    color = 'Rosa';
  }

  // 5. Generate clean readable SKU alias
  let cleanSku = 'ESTAMPA';
  if (/docinho/i.test(combined)) cleanSku = 'DOCINHO';
  else if (/lindinha/i.test(combined)) cleanSku = 'LINDINHA';
  else if (/estrelas/i.test(combined)) cleanSku = 'ESTRELAS';
  else if (/palmeiras/i.test(combined)) cleanSku = 'PALMEIRAS';
  else if (/naruto/i.test(combined)) cleanSku = 'NARUTO';
  else if (/pikachu|pokemon/i.test(combined)) cleanSku = 'PIKACHU';
  else if (/spider/i.test(combined)) cleanSku = 'SPIDER';
  else if (/boston/i.test(combined)) cleanSku = 'BOSTON';
  else if (/flores/i.test(combined)) cleanSku = 'FLORES';
  else {
    const words = rawTitle.replace(/camiseta|moletom|unissex|masculino|feminino|básica|plussize|oversized|linha|infantil|academia/gi, '').trim().split(/\s+/);
    cleanSku = (words[0] || 'ARTE').toUpperCase().slice(0, 10);
  }

  cleanSku = `${cleanSku}-${size.replace(/\s+/g, '')}`;

  return { garmentType, color, size, cleanSku };
}


function cleanHeaderNoise(str: string): string {
  return str
    .replace(/lista\s+de(\s+separação)?/gi, '')
    .replace(/separação/gi, '')
    .replace(/qtd\.?\s*de\s*(pedidos?|sku):?\s*\d+/gi, '')
    .replace(/total\s*\(itens\):?\s*\d+/gi, '')
    .replace(/título\s*&\s*variação/gi, '')
    .replace(/nº\s+de\s+pedido/gi, '')
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '')
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
    .replace(/\bpl\d{5,}\b/gi, '')
    .replace(/^[0-9\s:]+/g, '')
    .replace(/…|\.\.\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseUpSellerPdfText(text: string): ParsedOrderItem[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedOrderItem[] = [];
  let currentTitleLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Filter out common header phrases
    if (/lista de separação|qtd\. de pedidos|qtd\. de sku|total \(itens\)|título & variação|\d{2}\/\d{2}\/\d{4}|pl\d{6,}/i.test(line)) {
      continue;
    }

    // Check if line contains variation in parentheses e.g. "(Docinho Preto,G1)" or "(Branco 2, G)"
    const varMatch = line.match(/\(([^)]+)\)/);
    if (varMatch) {
      const variationText = varMatch[1].trim();
      const productTitle = cleanHeaderNoise(currentTitleLines.join(' '));
      currentTitleLines = [];

      let rawSku = '';
      let qty = 1;
      let orderNum = '';

      // Check next line for SKU
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const skuMatch = nextLine.match(/^([A-Z0-9_-]+)\s*[×xX]\s*(\d+)/i);
        if (skuMatch) {
          rawSku = skuMatch[1];
          qty = parseInt(skuMatch[2], 10) || 1;
          i++; // advance line
        }
      }

      // Check next line for Order Num and Qty
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const orderMatch = nextLine.match(/^([A-Z0-9_-]+)\s+(\d+)$/i);
        if (orderMatch) {
          orderNum = orderMatch[1];
          qty = parseInt(orderMatch[2], 10) || qty;
          i++; // advance line
        }
      }

      const { garmentType, color, size, cleanSku } = classifyGarment(productTitle, variationText);

      items.push({
        sku: rawSku || cleanSku,
        rawSku: rawSku || cleanSku,
        orderNum,
        productTitle: productTitle || 'Estampa UpSeller',
        variation: variationText,
        quantity: qty,
        garmentType,
        color,
        size,
      });
    } else {
      currentTitleLines.push(line);
    }
  }

  return items;
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

  if (skuCol === -1) skuCol = 0;
  if (titleCol === -1) titleCol = 1;
  if (qtyCol === -1) qtyCol = 2;

  const parsedItems: ParsedOrderItem[] = [];

  for (let i = startRowIdx; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawSku = String(row[skuCol] || '').trim();
    const rawTitle = String(row[titleCol] || '').trim();
    const rawQty = parseInt(String(row[qtyCol] || '1').replace(/\D/g, ''), 10) || 1;

    if (!rawSku && !rawTitle) continue;

    const { garmentType, color, size, cleanSku } = classifyGarment(rawTitle, rawSku);

    parsedItems.push({
      sku: cleanSku,
      rawSku,
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
  // First try UpSeller PDF multi-line structure
  const upSellerItems = parseUpSellerPdfText(text);
  if (upSellerItems.length > 0) {
    return upSellerItems;
  }

  // Fallback generic line parser
  const lines = text.split('\n');
  const items: ParsedOrderItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /código|quantidade|upseller|resumo|página|total/i.test(trimmed)) continue;

    const matchQty = trimmed.match(/(\d+)\s*$/);
    const qty = matchQty ? parseInt(matchQty[1], 10) : 1;
    const content = matchQty ? trimmed.slice(0, matchQty.index).trim() : trimmed;

    const parts = content.split(/\s{2,}|\t| - /);
    const skuPart = parts[0] ? parts[0].trim().toUpperCase() : 'SKU-ITEM';
    const titlePart = parts[1] ? parts[1].trim() : content;

    const { garmentType, color, size, cleanSku } = classifyGarment(titlePart, skuPart);

    items.push({
      sku: cleanSku,
      rawSku: skuPart,
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

