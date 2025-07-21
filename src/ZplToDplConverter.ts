/**
 * A service to convert a ZPL script string into a DPL script string.
 */
export class ZplToDplConverter {
  /**
   * Decompresses a ZPL ASCII hexadecimal graphic string into a pure hex string.
   */
  private decompressZplAsciiHex(zplData: string): string {
    let decompressed = '';
    const countCharMap: { [key: string]: number } = {};
    for (let i = 1; i <= 19; i++) {
      countCharMap[String.fromCharCode(70 + i)] = i;      // G-Y maps to 1-19
      countCharMap[String.fromCharCode(102 + i)] = i * 20; // g-y maps to 20-380
    }

    let i = 0;
    while (i < zplData.length) {
      const char = zplData[i];
      if (countCharMap[char]) {
        const repeatCount = countCharMap[char];
        const repeatChar = zplData[i + 1];
        decompressed += repeatChar.repeat(repeatCount);
        i += 2;
      } else {
        decompressed += char;
        i += 1;
      }
    }
    return decompressed.toUpperCase();
  }

  /**
   * Converts a ZPL script into a DPL script.
   */
  public convert(zplCode: string): string {
    let imageStorageScript = '';
    let layoutScript = '';

    // First, find and convert all stored images (~DG commands)
    const dgRegex = /\~DG(\w+),\d+,\d+,([A-Za-z0-9\n\r]+)/g;
    for (const match of zplCode.matchAll(dgRegex)) {
      const imageName = match[1];
      const compressedData = match[2].replace(/[\n\r]/g, '');
      const decompressedHex = this.decompressZplAsciiHex(compressedData);
      imageStorageScript += `ID${imageName}\r${decompressedHex}\r`;
    }

    // Second, find and convert all printable commands within the ^XA...^XZ block
    const labelFormatMatch = zplCode.match(/\^XA([\s\S]*?)\^XZ/);
    if (labelFormatMatch) {
      const labelContent = labelFormatMatch[1];
      const zplCommandRegex = /\^([A-Z0-9]{2})([^~^]*?)(?=\^|$)/g;
      let lastX = '0000';
      let lastY = '0000';

      const commands = [...labelContent.matchAll(zplCommandRegex)];
      for (const match of commands) {
        const command = match[1];
        const params = match[2];

        if (command === 'FO') {
          lastY = params.split(',')[1].padStart(4, '0');
          lastX = params.split(',')[0].padStart(4, '0');
          continue;
        }

        switch (command) {
          case 'FD':
            layoutScript += `1211000${lastY}${lastX}${params}\r`;
            break;
          case 'BC':
            const nextFd = commands.find(c => c.index > match.index && c[1] === 'FD');
            if (nextFd) {
              layoutScript += `B${'C'}${lastY}${lastX}${nextFd[2]}\r`;
            }
            break;
          case 'GB':
            const [width, height, thickness = 1] = params.split(',').map(p => parseInt(p, 10));
            const xEnd = (parseInt(lastX, 10) + width).toString().padStart(4, '0');
            const yEnd = (parseInt(lastY, 10) + height).toString().padStart(4, '0');
            layoutScript += `E${lastY},${lastX},${yEnd},${xEnd},${thickness},${thickness}\r`;
            break;
          case 'XG':
            const imageName = params.split(':')[1]?.split(',')[0];
            if (imageName) {
              layoutScript += `Y${lastY},${lastX},${imageName}\r`;
            }
            break;
        }
      }
    }

    // Finally, assemble the complete DPL script
    return `\x02L\rD11\r${imageStorageScript}${layoutScript}E\r`;
  }
}