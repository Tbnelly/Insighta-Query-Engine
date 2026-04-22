const generateUUIDv7 = () => {
  const now = Date.now();

  // Convert timestamp to hex, padded to 12 chars (48 bits)
  const tsHex = now.toString(16).padStart(12, '0');

  // Random hex for remaining bits
  const randomHex = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');

  // Build UUID v7 segments
  const seg1 = tsHex.slice(0, 8);           // 32 bits of timestamp
  const seg2 = tsHex.slice(8, 12);          // 16 bits of timestamp
  const seg3 = '7' + randomHex().slice(1);  // version 7 + 12 random bits
  const seg4 = (
    (parseInt(randomHex(), 16) & 0x3fff) | 0x8000
  ).toString(16).padStart(4, '0');           // variant bits + 14 random bits
  const seg5 = randomHex() + randomHex() + randomHex(); // 48 random bits

  return `${seg1}-${seg2}-${seg3}-${seg4}-${seg5}`;
};

module.exports = { generateUUIDv7 };