// RFC 1320, section 3. MD4 is required by NTLM's password hash; it must not
// be used as a general-purpose cryptographic hash. This implementation only
// accepts bytes: the NTLM caller is responsible for UTF-16LE encoding.
const shifts = [3, 7, 11, 19, 3, 5, 9, 13, 3, 9, 11, 15]
const round3 = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]

export const md4 = (input: Uint8Array): Uint8Array => {
  const padded = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64)
  padded.set(input)
  padded[input.length] = 0x80
  const data = new DataView(padded.buffer)
  data.setUint32(padded.length - 8, input.length * 8, true)
  data.setUint32(padded.length - 4, Math.floor(input.length / 0x20000000), true)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  for (let offset = 0; offset < padded.length; offset += 64) {
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    for (let step = 0; step < 48; step++) {
      const i = step & 15
      let f: number
      let k: number
      let constant: number
      let shift: number
      if (step < 16) {
        f = (b & c) | (~b & d)
        k = i
        constant = 0
        shift = shifts[i & 3]
      } else if (step < 32) {
        f = (b & c) | (b & d) | (c & d)
        k = (i & 3) * 4 + (i >>> 2)
        constant = 0x5a827999
        shift = shifts[4 + (i & 3)]
      } else {
        f = b ^ c ^ d
        k = round3[i]
        constant = 0x6ed9eba1
        shift = shifts[8 + (i & 3)]
      }
      const sum = (a + f + data.getUint32(offset + k * 4, true) + constant) | 0
      a = d
      d = c
      c = b
      b = (sum << shift) | (sum >>> (32 - shift))
    }
    h0 = (h0 + a) | 0
    h1 = (h1 + b) | 0
    h2 = (h2 + c) | 0
    h3 = (h3 + d) | 0
  }
  padded.fill(0)
  const output = new Uint8Array(16)
  const digest = new DataView(output.buffer)
  digest.setUint32(0, h0, true)
  digest.setUint32(4, h1, true)
  digest.setUint32(8, h2, true)
  digest.setUint32(12, h3, true)
  return output
}
