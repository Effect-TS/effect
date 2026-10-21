export const base32 = (bytes: Uint8Array): string => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

  let bits = 0,
    value = 0,
    output = ""

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      output += alphabet[(value >>> bits) & 31]
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31]

  return output
}
