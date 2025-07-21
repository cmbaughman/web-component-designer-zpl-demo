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
    // Calculate the grayscale value (average of R, G, B)
    const gray = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
    // Apply threshold to determine black or white
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
        // Convert the completed byte to a 2-digit hex string
        hexString += byte.toString(16).padStart(2, '0').toUpperCase();
        byte = 0;
        bitCount = 0;
      }
    }
    // If there are leftover bits at the end of a row, pad and add them
    if (bitCount > 0) {
      byte = byte << (8 - bitCount);
      hexString += byte.toString(16).padStart(2, '0').toUpperCase();
    }
  }
  return hexString;
}

export { loadImage, imageToMonochromeBitmap, bitmapToDplHex };