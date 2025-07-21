import { IDesignItem } from '@node-projects/web-component-designer';

/**
 * A service to convert a layout of design items into a DPL (Datamax Programming Language) script.
 * This enhanced version supports text, barcodes (1D and QR Codes), boxes, circles, and lines.
 */
export class DplLayoutPrinterService {
    /**
     * Converts a ZPL element's pixel position to a 4-digit padded string required by DPL.
     * @param value The CSS position value (e.g., "150px").
     * @returns A zero-padded string (e.g., "0150").
     */
    private toDplPosition(value: string): string {
        return parseFloat(value).toFixed(0).padStart(4, '0');
    }

    /**
     * The main method to generate the DPL script from a collection of design items.
     * @param designItems An array of design items from the web-component-designer canvas.
     * @returns A promise that resolves to the complete DPL script string.
     */
    public async print(designItems: IDesignItem[]): Promise<string> {
        let dplScript = '';

        // --- 1. Start Label and Set Configuration ---
        dplScript += '\x02L\r'; // <STX>L<CR> - Start new label, clear buffer
        dplScript += 'D11\r';   // Set default direction and print mode

        // --- 2. Iterate Through Design Elements ---
        for (const item of designItems) {
            const element = item.element as HTMLElement;
            const tagName = element.tagName.toLowerCase();
            const x = this.toDplPosition(item.getStyle('left'));
            const y = this.toDplPosition(item.getStyle('top'));

            // --- 3. Generate DPL Code Based on Element Type ---
            switch (tagName) {
                case 'zpl-text':
                  const text = element.getAttribute('text') || '';
                  // DPL Text Command: <Font><Y-Pos><X-Pos><Data>
                  // "1211000" specifies Font, Size, Style, and Rotation.
                  dplScript += `1211000${y}${x}${text}\r`;
                  break;
                case 'zpl-barcode':
                  const data = element.getAttribute('data') || '';
                  const barcodeType = element.getAttribute('type')?.toLowerCase();

                  if (barcodeType === 'qrcode') {
                    // QR Code is a special 2D barcode command in DPL.
                    // Format: B<Symbology>,<Options...><Y-Pos>,<X-Pos>,<Data>
                    dplScript += `B Q,M,S7${y},${x},d2,${data}\r`;
                  }
                  else {
                    // Standard 1D Barcodes (Code 128, Code 39, etc.)
                    const dplBarcodeType = element.getAttribute('type') || 'C';
                    // DPL Barcode Command: B<Type><Y-Pos><X-Pos><Data>
                    dplScript += `B${dplBarcodeType}${y}${x}${data}\r`;
                  }
                  break;
                case 'zpl-graphic-box':
                  const width = parseFloat(item.getStyle('width'));
                  const height = parseFloat(item.getStyle('height'));
                  const thickness = parseFloat(element.getAttribute('thickness') || '1');
                  const xEnd = this.toDplPosition((parseFloat(x) + width).toString());
                  const yEnd = this.toDplPosition((parseFloat(y) + height).toString());
                  // DPL Box Command: E<Y-Start><X-Start><Y-End><X-End><Y-Thickness><X-Thickness>
                  dplScript += `E${y},${x},${yEnd},${xEnd},${thickness},${thickness}\r`;
                  break;
                case 'zpl-graphic-circle':
                  const diameter = parseFloat(item.getStyle('width')); // Assume width is the diameter
                  const thicknessC = parseFloat(element.getAttribute('thickness') || '1');
                  // DPL Circle Command: C<Y-Center><X-Center><Diameter><Thickness>
                  dplScript += `C${y},${x},${diameter},${thicknessC}\r`;
                  break;
                case 'zpl-graphic-diagonal-line':
                  const width2 = parseFloat(item.getStyle('width'));
                  const height2 = parseFloat(item.getStyle('height'));
                  const thickness2 = parseFloat(element.getAttribute('thickness') || '1');
                  // Calculate the end coordinates based on element's position and size
                  const xEnd2 = this.toDplPosition((parseFloat(x) + width2).toString());
                  const yEnd2 = this.toDplPosition((parseFloat(y) + height2).toString());
                  // DPL Line Command: X<Y-Start><X-Start><Y-End><X-End><Thickness>
                  dplScript += `X${y},${x},${yEnd2},${xEnd2},${thickness2}\r`;
                  break;
                case 'zpl-image':
                  // **IMPORTANT NOTE ON IMAGES**
                  // DPL cannot render images from a URL directly. The image must first be
                  // converted to a 1-bit monochrome bitmap and stored in the printer's memory.
                  // This process happens *before* the print job is sent.

                  // 1. You would need a separate function to fetch the image, convert it to a
                  //    monochrome hex string, and send it with an 'I' (Store Image) command.
                  // 2. Then, you recall it here with the 'Y' command.

                  const imageName = element.getAttribute('image-name') || 'IMG001'; // Assume it has a unique name

                  // DPL Recall Image Command: Y<Y-Pos><X-Pos><ImageName>
                  dplScript += `Y${y},${x},${imageName}\r`;
                  break;
                default:
                  console.warn(`Unsupported element type: ${tagName}`);
                  break;
            }
        }

        // --- 4. End of Label ---
        dplScript += 'E\r';

        return dplScript;
    }
}