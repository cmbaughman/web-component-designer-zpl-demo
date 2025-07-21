import { IDesignItem } from '@node-projects/web-component-designer';
import { loadImage, imageToMonochromeBitmap, bitmapToDplHex } from './dpl-image-helpers';

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