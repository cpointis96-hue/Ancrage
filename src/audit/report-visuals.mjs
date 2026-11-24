const maxBase64Length = 180_000;
const frameMarkers = new Set([0xc0, 0xc1, 0xc2]);

export function jpegSize(encoded) {
  if (typeof encoded !== 'string' || encoded.length > maxBase64Length || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return null;
  for (let offset = 2; offset + 8 < bytes.length;) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length || marker === 0xda) return null;
    if (frameMarkers.has(marker) && length >= 11) {
      const height = bytes.readUInt16BE(offset + 5);
      const width = bytes.readUInt16BE(offset + 7);
      if (width > 0 && width <= 2048 && height > 0 && height <= 2048 && bytes[offset + 4] === 8 && bytes[offset + 9] === 3) return { width, height };
      return null;
    }
    offset += 2 + length;
  }
  return null;
}
