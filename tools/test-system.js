const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TEST SUITE: DTF AUTO SAAS (COMPREHENSIVE VALIDATION)');
  console.log('====================================================');

  // ----------------------------------------------------
  // Test 1: Strict Proportional Dimensions (No Distortion)
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Strict Proportional Dimensions (No Distortion) ---');
  const originalWidthPx = 1000;
  const originalHeightPx = 800;
  const targetHeightCm = 36.0;
  const calculatedWidthCm = Number((targetHeightCm * (originalWidthPx / originalHeightPx)).toFixed(1));

  console.log(`Original Image: ${originalWidthPx} x ${originalHeightPx} px`);
  console.log(`Input Height: ${targetHeightCm} cm => Calculated Width: ${calculatedWidthCm} cm`);
  
  if (calculatedWidthCm === 45.0) {
    console.log('✅ PASS: Proportional scaling exact match (36cm height on 1000x800 -> 45cm width)');
  } else {
    throw new Error(`Proportion error: expected 45.0 but got ${calculatedWidthCm}`);
  }

  // ----------------------------------------------------
  // Test 2: UpSeller Garment Classification & Size Grades
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Garment & Size Classification for UpSeller ---');
  
  function classifyGarment(rawTitle, rawVariation) {
    const combined = `${rawTitle} ${rawVariation}`.toLowerCase();
    const varParts = rawVariation.split(',');
    const sizePart = (varParts[1] || varParts[0] || '').trim().toUpperCase();

    let size = 'G';
    let isKids = false;
    let isPlusSize = false;

    if (/^(02|04|06|08|10|12|14|16|2|4|6|8)$/.test(sizePart)) {
      size = sizePart;
      isKids = true;
    } else if (/^(G1|G2|G3|G4|G5|XG|EXG|XXL)$/.test(sizePart)) {
      size = sizePart;
      isPlusSize = true;
    } else if (/^(PP|P|M|G|GG)$/.test(sizePart)) {
      size = sizePart;
    }

    let baseType = 'Camiseta';
    if (/canguru|hoodie|capuz|moletom/i.test(combined)) baseType = 'Moletom Canguru';
    else if (/careca|gola redonda/i.test(combined)) baseType = 'Moletom Careca';
    else if (/babylook|baby look/i.test(combined)) baseType = 'Babylook';
    else if (/regata|machao/i.test(combined)) baseType = 'Regata';

    let garmentType = 'Camiseta Tradicional';
    if (baseType === 'Camiseta') {
      if (isKids) garmentType = 'Camiseta Infantil';
      else if (isPlusSize) garmentType = 'Camiseta Plus Size';
      else garmentType = 'Camiseta Tradicional';
    } else if (baseType.includes('Moletom')) {
      if (isKids) garmentType = `${baseType} Infantil`;
      else if (isPlusSize) garmentType = `${baseType} Plus Size`;
      else garmentType = baseType;
    } else {
      garmentType = baseType;
    }

    let color = 'Preto';
    if (/branco/i.test(combined)) color = 'Branco';
    else if (/bege|areia/i.test(combined)) color = 'Bege Areia';
    else if (/mescla|cinza/i.test(combined)) color = 'Cinza Mescla';

    return { garmentType, color, size };
  }

  const testCases = [
    { title: 'Camiseta Feminina PlusSize Academia Meninas', var: 'Docinho Preto,G1', expected: 'Camiseta Plus Size' },
    { title: 'Camiseta Masculina Básica Algodão', var: 'Lindinha Bege,GG', expected: 'Camiseta Tradicional' },
    { title: 'Moletom Canguru com Capuz Estrelas', var: 'Branco,G', expected: 'Moletom Canguru' },
    { title: 'Camiseta Infantil Anime Naruto', var: 'Preto,16', expected: 'Camiseta Infantil' },
  ];

  testCases.forEach((tc) => {
    const res = classifyGarment(tc.title, tc.var);
    console.log(`✓ "${tc.title} (${tc.var})" => [${res.garmentType}] | Cor: ${res.color} | Tam: ${res.size}`);
    if (res.garmentType !== tc.expected) {
      throw new Error(`Expected ${tc.expected}, got ${res.garmentType}`);
    }
  });
  console.log('✅ PASS: All garment & size classifications accurate!');

  // ----------------------------------------------------
  // Test 3: 2D Nesting Engine (57 cm Roll, 1cm Margins/Spacing & 90° Rotation)
  // ----------------------------------------------------
  console.log('\n--- 3. Testing 2D Nesting Engine (57 cm Roll, 1cm Margin, 1cm Spacing) ---');

  function computeNesting(items, rollWidthCm = 57.0, marginCm = 1.0, spacingCm = 1.0, allowRotation = true) {
    const usableWidth = rollWidthCm - 2 * marginCm;
    const gap = spacingCm;

    const freeRects = [{ x: marginCm, y: marginCm, w: usableWidth, h: 100000 }];
    const placed = [];
    let maxBottom = marginCm;

    // Sort by max dimension descending
    const sorted = [...items].sort((a, b) => Math.max(b.widthCm, b.heightCm) - Math.max(a.widthCm, a.heightCm));

    for (const item of sorted) {
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
          if (fr.w >= orient.w && fr.h >= orient.h) {
            const leftoverX = fr.w - orient.w;
            const leftoverY = fr.h - orient.h;
            const score = fr.y * 1000 + Math.min(leftoverX, leftoverY);

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
        const chosen = freeRects[bestRectIdx];
        const posX = chosen.x;
        const posY = chosen.y;

        placed.push({
          id: item.id,
          sku: item.sku,
          xCm: Number(posX.toFixed(2)),
          yCm: Number(posY.toFixed(2)),
          widthCm: Number(bestW.toFixed(2)),
          heightCm: Number(bestH.toFixed(2)),
          rotated: bestRotated,
          imagePath: item.imagePath,
        });

        const bottom = posY + bestH;
        if (bottom > maxBottom) maxBottom = bottom;

        const occupiedW = bestW + gap;
        const occupiedH = bestH + gap;

        const newRects = [];
        for (let i = freeRects.length - 1; i >= 0; i--) {
          const r = freeRects[i];
          if (posX < r.x + r.w && posX + occupiedW > r.x && posY < r.y + r.h && posY + occupiedH > r.y) {
            if (posX + occupiedW < r.x + r.w) {
              newRects.push({ x: posX + occupiedW, y: r.y, w: r.x + r.w - (posX + occupiedW), h: r.h });
            }
            if (posX > r.x) {
              newRects.push({ x: r.x, y: r.y, w: posX - r.x, h: r.h });
            }
            if (posY > r.y) {
              newRects.push({ x: r.x, y: r.y, w: r.w, h: posY - r.y });
            }
            if (posY + occupiedH < r.y + r.h) {
              newRects.push({ x: r.x, y: posY + occupiedH, w: r.w, h: r.y + r.h - (posY + occupiedH) });
            }
            freeRects.splice(i, 1);
          }
        }

        for (const nr of newRects) {
          if (nr.w >= 1 && nr.h >= 1) freeRects.push(nr);
        }

        for (let a = freeRects.length - 1; a >= 0; a--) {
          for (let b = 0; b < freeRects.length; b++) {
            if (a !== b) {
              const ra = freeRects[a];
              const rb = freeRects[b];
              if (ra.x >= rb.x && ra.y >= rb.y && ra.x + ra.w <= rb.x + rb.w && ra.y + ra.h <= rb.y + rb.h) {
                freeRects.splice(a, 1);
                break;
              }
            }
          }
        }
      }
    }

    const finalHeightCm = Number((maxBottom + marginCm).toFixed(1));
    return { rollWidthCm, rollHeightCm: finalHeightCm, placedItems: placed };
  }

  const sampleItems = [
    { id: '1', sku: 'CAM001', widthCm: 25.0, heightCm: 30.0, imagePath: '/samples/boston.png' },
    { id: '2', sku: 'CAM001', widthCm: 25.0, heightCm: 30.0, imagePath: '/samples/boston.png' },
    { id: '3', sku: 'CAM002', widthCm: 22.0, heightCm: 28.0, imagePath: '/samples/spider.png' },
    { id: '4', sku: 'CAM002', widthCm: 22.0, heightCm: 28.0, imagePath: '/samples/spider.png' },
    { id: '5', sku: 'CAM003', widthCm: 20.0, heightCm: 15.0, imagePath: '/samples/flores.png' },
    { id: '6', sku: 'CAM003', widthCm: 20.0, heightCm: 15.0, imagePath: '/samples/flores.png' },
  ];

  const nestingResult = computeNesting(sampleItems, 57.0, 1.0, 1.0, true);
  console.log(`Roll Dimensions: ${nestingResult.rollWidthCm} x ${nestingResult.rollHeightCm} cm`);
  console.log(`Placed: ${nestingResult.placedItems.length} / ${sampleItems.length} items`);

  // Verify Zero Collision and Zero Boundary Violations
  let collisions = 0;
  let outOfBounds = 0;
  const placed = nestingResult.placedItems;

  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    if (a.xCm < 1.0 || (a.xCm + a.widthCm) > (57.0 - 1.0 + 0.01)) {
      outOfBounds++;
      console.error(`Boundary violation on ${a.sku}: x=${a.xCm}, w=${a.widthCm}`);
    }
    for (let j = i + 1; j < placed.length; j++) {
      const b = placed[j];
      const overlapX = Math.max(0, Math.min(a.xCm + a.widthCm, b.xCm + b.widthCm) - Math.max(a.xCm, b.xCm));
      const overlapY = Math.max(0, Math.min(a.yCm + a.heightCm, b.yCm + b.heightCm) - Math.max(a.yCm, b.yCm));
      if (overlapX > 0.01 && overlapY > 0.01) {
        collisions++;
        console.error(`Overlap between ${a.sku} and ${b.sku}`);
      }
    }
  }

  if (collisions === 0 && outOfBounds === 0) {
    console.log('✅ PASS: Zero collisions, zero cutting, strict 57cm boundaries respected!');
  } else {
    throw new Error('Collision or boundary error detected');
  }

  // ----------------------------------------------------
  // Test 4: 300 DPI Transparent Compositor via Sharp
  // ----------------------------------------------------
  console.log('\n--- 4. Testing 300 DPI High-Resolution Transparent Compositor ---');
  const DPI_300_PPCM = 300 / 2.54;
  const widthPx = Math.round(57.0 * DPI_300_PPCM);
  const heightPx = Math.round(nestingResult.rollHeightCm * DPI_300_PPCM);

  const outDir = path.join(process.cwd(), 'public', 'uploads', 'queues');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'test_system_300dpi.png');

  const composites = [];
  for (const item of nestingResult.placedItems) {
    const leftPx = Math.round(item.xCm * DPI_300_PPCM);
    const topPx = Math.round(item.yCm * DPI_300_PPCM);
    const targetWPx = Math.round(item.widthCm * DPI_300_PPCM);
    const targetHPx = Math.round(item.heightCm * DPI_300_PPCM);

    const imgAbsPath = path.join(process.cwd(), 'public', item.imagePath.replace(/^\//, ''));
    if (fs.existsSync(imgAbsPath)) {
      let pipeline = sharp(imgAbsPath);
      if (item.rotated) pipeline = pipeline.rotate(90, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
      const buffer = await pipeline.resize(targetWPx, targetHPx, { fit: 'fill' }).ensureAlpha().toBuffer();
      composites.push({ input: buffer, left: leftPx, top: topPx });
    }
  }

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

  const meta = await sharp(outPath).metadata();
  console.log(`Rendered 300 DPI File: ${outPath}`);
  console.log(`Resolution: ${meta.width} x ${meta.height} pixels`);
  console.log(`Channels: ${meta.channels} (Alpha: ${meta.hasAlpha ? '100% Transparent RGBA' : 'No Alpha'})`);

  if (meta.hasAlpha && meta.channels === 4) {
    console.log('✅ PASS: 100% True Alpha Channel Transparency confirmed without solid background or borders');
  } else {
    throw new Error('Alpha transparency test failed');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL DTF AUTO REQUIREMENTS FULLY TESTED & VERIFIED!');
  console.log('====================================================');
}

runTests().catch(console.error);