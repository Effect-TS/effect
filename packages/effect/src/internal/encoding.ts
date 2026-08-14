const byteToHex: Array<string> = []
for (let i = 0; i < 256; i++) {
  byteToHex.push(i.toString(16).padStart(2, "0"))
}

/** @internal */
export const encodeHex = (bytes: Uint8Array): string => {
  let result = ""
  for (let i = 0; i < bytes.length; i++) {
    result += byteToHex[bytes[i]]
  }
  return result
}

const randomWords = new Uint32Array(96)
const randomBytes = new Uint8Array(randomWords.buffer)
let randomBytesOffset = randomBytes.length

/** @internal */
export const randomHexString = (length: number): string => {
  const bytes = length >>> 1
  if (randomBytesOffset + bytes > randomBytes.length) {
    for (let i = 0; i < randomWords.length; i++) {
      randomWords[i] = (Math.random() * 0x100000000) >>> 0
    }
    randomBytesOffset = 0
  }
  const result = encodeHex(randomBytes.subarray(randomBytesOffset, randomBytesOffset + bytes))
  randomBytesOffset += bytes
  return result
}
