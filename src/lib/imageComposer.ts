import sharp, { OverlayOptions } from 'sharp';
import path from 'path';
import fs from 'fs';
import { PlacedItem } from './nesting';
import { uploadQueueRenderFile, fetchImageBufferForSharp } from './storage';

// 300 DPI Math: 1 cm = 300 / 2.54 = 118.110236 px
export const DPI_300_PPCM = 300 / 2.54;

export async function renderHighResDTFQueue(
  queueId: string,
  rollWidthCm: number,
  rollHeightCm: number,
  placedItems: PlacedItem[],
  userId = 'user_demo_01'
): Promise<{ filePath: string; publicUrl: string; widthPx: number; heightPx: number }> {
  // Automatically expand height so no art is EVER cut at 1 meter or any boundary
  const maxBottomCm = placedItems.reduce((max, it) => Math.max(max, it.yCm + it.heightCm), 0);
  const effectiveHeightCm = Math.max(rollHeightCm, maxBottomCm + 0.5);

  const widthPx = Math.round(rollWidthCm * DPI_300_PPCM);
  const heightPx = Math.round(effectiveHeightCm * DPI_300_PPCM);

  const outFilename = `queue-${queueId}-300dpi.png`;

  // Prepare composite overlays
  const composites: OverlayOptions[] = [];

  for (const item of placedItems) {
    const leftPx = Math.round(item.xCm * DPI_300_PPCM);
    const topPx = Math.round(item.yCm * DPI_300_PPCM);
    const targetWPx = Math.round(item.widthCm * DPI_300_PPCM);
    const targetHPx = Math.round(item.heightCm * DPI_300_PPCM);

    const imgBuffer = await fetchImageBufferForSharp(item.imagePath);

    if (imgBuffer && imgBuffer.length > 0) {
      try {
        const isSvg = item.imagePath.toLowerCase().endsWith('.svg') || imgBuffer.toString('utf8', 0, 100).includes('<svg');
        let pipeline = isSvg ? sharp(imgBuffer, { density: 300 }) : sharp(imgBuffer);
        
        const angle = item.rotation !== undefined ? item.rotation : (item.rotated ? 90 : 0);
        if (angle % 360 !== 0) {
          pipeline = pipeline.rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
        }

        // Resize with alpha channel preservation and strict aspect containment
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
  const renderedBuffer = await sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();

  // Save to storage (Cloud Storage or Local Filesystem fallback)
  const storageResult = await uploadQueueRenderFile(userId, outFilename, renderedBuffer);

  return {
    filePath: storageResult.storagePath,
    publicUrl: storageResult.publicUrl,
    widthPx,
    heightPx,
  };
}
