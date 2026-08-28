export interface NestingInputItem {
  id: string;
  sku: string;
  title: string;
  widthCm: number;
  heightCm: number;
  imagePath: string;
  garmentInfo?: string;
  rotation?: number;
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
  rotation?: number; // 0, 90, 180, 270 or arbitrary angle
  imagePath: string;
  garmentInfo?: string;
}

export interface NestingResult {
  rollWidthCm: number;
  rollHeightCm: number;
  metroCount: number;
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
  rollWidthCm = 57.0, // Standard 57 cm width as requested
  marginCm = 1.0,     // Standard 1 cm margin as requested
  spacingCm = 1.0,    // Standard 1 cm spacing as requested
  allowRotation = true
): NestingResult {
  if (!items || items.length === 0) {
    return {
      rollWidthCm,
      rollHeightCm: 100.0,
      metroCount: 1,
      efficiencyPercent: 0,
      totalArtAreaCm2: 0,
      linearSavingsCm: 0,
      estimatedSavingsBrl: 0,
      placedItems: [],
    };
  }

  const usableWidth = Math.max(1, rollWidthCm - 2 * marginCm);
  const gap = spacingCm;

  // Calculate total art area
  let totalArtAreaCm2 = 0;
  let naiveHeightCm = marginCm;

  items.forEach((it) => {
    totalArtAreaCm2 += it.widthCm * it.heightCm;
    naiveHeightCm += it.heightCm + gap;
  });

  // Comprehensive sorting heuristics to find global optimum
  const sortStrategies = [
    (a: NestingInputItem, b: NestingInputItem) => Math.max(b.widthCm, b.heightCm) - Math.max(a.widthCm, a.heightCm), // Max dimension
    (a: NestingInputItem, b: NestingInputItem) => b.heightCm * b.widthCm - a.heightCm * a.widthCm, // Area desc
    (a: NestingInputItem, b: NestingInputItem) => b.heightCm - a.heightCm, // Height desc
    (a: NestingInputItem, b: NestingInputItem) => b.widthCm - a.widthCm, // Width desc
    (a: NestingInputItem, b: NestingInputItem) => (b.widthCm + b.heightCm) - (a.widthCm + a.heightCm), // Perimeter desc
    (a: NestingInputItem, b: NestingInputItem) => (b.heightCm / (b.widthCm || 1)) - (a.heightCm / (a.widthCm || 1)), // Aspect ratio
    (a: NestingInputItem, b: NestingInputItem) => Math.min(b.widthCm, b.heightCm) - Math.min(a.widthCm, a.heightCm), // Short side
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
  const metroCount = Math.max(1, Math.ceil(finalHeightCm / 100));
  const totalRollAreaCm2 = rollWidthCm * finalHeightCm;
  const efficiencyPercent = totalRollAreaCm2 > 0 ? Number(((totalArtAreaCm2 / totalRollAreaCm2) * 100).toFixed(1)) : 0;
  
  const linearSavingsCm = Math.max(0, Number((naiveHeightCm - finalHeightCm).toFixed(1)));
  // Average DTF price in Brazil: R$ 45,00/metro linear (R$ 0.45/cm)
  const estimatedSavingsBrl = Number(((linearSavingsCm / 100) * 45.0).toFixed(2));

  return {
    rollWidthCm,
    rollHeightCm: finalHeightCm,
    metroCount,
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
  const freeRects: FreeRect[] = [{ x: margin, y: margin, w: usableWidth, h: 100000 }];
  const placed: PlacedItem[] = [];
  let maxBottom = margin;

  for (const item of items) {
    let bestScore = Infinity;
    let bestRectIdx = -1;
    let bestRotated = false;
    let bestRotation = item.rotation || 0;
    let bestW = item.widthCm;
    let bestH = item.heightCm;

    // Test orientations (0° upright, 90° turned, 180° inverted, 270° turned)
    const orientations: { w: number; h: number; rotated: boolean; rotation: number }[] = [
      { w: item.widthCm, h: item.heightCm, rotated: false, rotation: 0 }
    ];

    if (allowRotation) {
      if (item.widthCm !== item.heightCm) {
        orientations.push({ w: item.heightCm, h: item.widthCm, rotated: true, rotation: 90 });
      }
    }

    for (let r = 0; r < freeRects.length; r++) {
      const fr = freeRects[r];
      for (const orient of orientations) {
        const itemWWithGap = orient.w;
        const itemHWithGap = orient.h;

        if (fr.w >= itemWWithGap && fr.h >= itemHWithGap) {
          // BSSF (Best Short Side Fit) heuristic prioritizing top-to-bottom and side-by-side filling
          const leftoverX = fr.w - itemWWithGap;
          const leftoverY = fr.h - itemHWithGap;
          const shortSideFit = Math.min(leftoverX, leftoverY);
          
          // Weight Y heavily to pack tightly into the meter
          const score = fr.y * 1000 + shortSideFit;

          if (score < bestScore) {
            bestScore = score;
            bestRectIdx = r;
            bestRotated = orient.rotated;
            bestRotation = orient.rotation;
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
        rotation: bestRotation,
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

