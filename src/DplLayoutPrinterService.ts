import { IDesignItem } from '@node-projects/web-component-designer';

// Helper Functions for Image Processing
/**
 * Fetches an image from a URL and converts it into an HTMLImageElement.
 * @param src The URL of the image.
 * @returns A promise that resolves to an HTMLImageElement.
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Necessary for loading images from other domains
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image at: ${src}`));
    img.src = src;
  });
}

/**
 * Converts an image into a monochrome (1-bit) bitmap array using a canvas.
 * @param image The HTMLImageElement to convert.
 * @param threshold A value from 0-255 to determine the black/white cutoff.
 * @returns An object containing the bitmap data array, width, and height.
 */
function imageToMonochromeBitmap(image: HTMLImageElement, threshold: number = 128): { data: Uint8Array, width: number, height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const monochromeData = new Uint8Array(Math.ceil(imageData.data.length / 4));

  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
    const gray = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
    monochromeData[j] = gray < threshold ? 1 : 0; // 1 for black, 0 for white
  }

  return { data: monochromeData, width: image.width, height: image.height };
}

/**
 * Encodes a monochrome bitmap into a DPL-compatible hexadecimal string.
 * @param bitmap An object containing the bitmap data, width, and height.
 * @returns The DPL hexadecimal string.
 */
function bitmapToDplHex(bitmap: { data: Uint8Array, width: number, height: number }): string {
  let hexString = '';
  for (let y = 0; y < bitmap.height; y++) {
    let byte = 0;
    let bitCount = 0;
    for (let x = 0; x < bitmap.width; x++) {
      byte = (byte << 1) | bitmap.data[y * bitmap.width + x];
      bitCount++;
      if (bitCount === 8) {
        hexString += byte.toString(16).padStart(2, '0').toUpperCase();
        byte = 0;
        bitCount = 0;
      }
    }
    if (bitCount > 0) {
      byte = byte << (8 - bitCount);
      hexString += byte.toString(16).padStart(2, '0').toUpperCase();
    }
  }
  return hexString;
}

/**
 * A service to convert a layout of design items into a DPL (Datamax Programming Language) script.
 */
export class DplLayoutPrinterService {
  private toDplPosition(value: string): string {
    return parseFloat(value).toFixed(0).padStart(4, '0');
  }

  public async print(designItems: IDesignItem[]): Promise<string> {
    let imageStorageScript = '';
    let layoutScript = '';

    // First pass: find all images and generate the 'I' commands to store them.
    for (const item of designItems) {
      const element = item.element as HTMLElement;
      if (element.tagName.toLowerCase() === 'zpl-image') {
        const src = element.getAttribute('src');
        if (!src) continue;
        try {
          const imageName = element.getAttribute('image-name') || `IMG${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const image = await loadImage(src);
          const monochromeBitmap = imageToMonochromeBitmap(image);
          const dplHexData = bitmapToDplHex(monochromeBitmap);
          imageStorageScript += `ID${imageName}\r${dplHexData}\r`;
          element.setAttribute('data-dpl-name', imageName);
        } catch (error) {
          console.error("Could not process image:", error);
        }
      }
    }

    // Second pass: generate layout commands for all elements.
    for (const item of designItems) {
      const element = item.element as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const x = this.toDplPosition(item.getStyle('left'));
      const y = this.toDplPosition(item.getStyle('top'));

      switch (tagName) {
        case 'zpl-text':
          const text = element.getAttribute('text') || '';
          layoutScript += `1211000${y}${x}${text}\r`;
          break;
        case 'zpl-barcode':
          const data = element.getAttribute('data') || '';
          const barcodeType = element.getAttribute('type')?.toLowerCase();
          if (barcodeType === 'qrcode') {
            layoutScript += `B Q,M,S7${y},${x},d2,${data}\r`;
          } else {
            const dplBarcodeType = element.getAttribute('type') || 'C';
            layoutScript += `B${dplBarcodeType}${y}${x}${data}\r`;
          }
          break;
        case 'zpl-graphic-box':
          const width = parseFloat(item.getStyle('width'));
          const height = parseFloat(item.getStyle('height'));
          const thickness = parseFloat(element.getAttribute('thickness') || '1');
          const xEnd = this.toDplPosition((parseFloat(x) + width).toString());
          const yEnd = this.toDplPosition((parseFloat(y) + height).toString());
          layoutScript += `E${y},${x},${yEnd},${xEnd},${thickness},${thickness}\r`;
          break;
        case 'zpl-graphic-circle':
          const diameter = parseFloat(item.getStyle('width'));
          const thicknessC = parseFloat(element.getAttribute('thickness') || '1');
          layoutScript += `C${y},${x},${diameter},${thicknessC}\r`;
          break;
        case 'zpl-graphic-diagonal-line':
          const widthL = parseFloat(item.getStyle('width'));
          const heightL = parseFloat(item.getStyle('height'));
          const thicknessL = parseFloat(element.getAttribute('thickness') || '1');
          const xEndL = this.toDplPosition((parseFloat(x) + widthL).toString());
          const yEndL = this.toDplPosition((parseFloat(y) + heightL).toString());
          layoutScript += `X${y},${x},${yEndL},${xEndL},${thicknessL}\r`;
          break;
        case 'zpl-image':
          const recalledImageName = element.getAttribute('data-dpl-name');
          if (recalledImageName) {
            layoutScript += `Y${y},${x},${recalledImageName}\r`;
          }
          break;
      }
    }

    // Assemble the final script in the correct order.
    return `\x02L\rD11\r${imageStorageScript}${layoutScript}E\r`;
  }
}