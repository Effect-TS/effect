// Snappy raw block format:
// https://github.com/google/snappy/blob/1.2.2/format_description.txt
import { type Decoder, fail, failOutputLimit, readUint32 } from "./failure.ts"

const truncated = (): never => fail("Truncated", "the input ends inside a Snappy element")

const tooLong = (length: number): never =>
  fail("Malformed", `the data is longer than the ${length} bytes recorded in the preamble`)

/** @internal */
export const snappy: Decoder = (input, limit) => {
  const end = input.length
  // Preamble: the uncompressed length as a little-endian varint of at most
  // 32 bits, so at most 5 bytes
  let length = 0
  let ip = 0
  for (let shift = 0;; shift += 7) {
    if (ip >= end) truncated()
    if (shift === 35) fail("Malformed", "the preamble is longer than 5 bytes")
    const byte = input[ip++]
    length += (byte & 0x7f) * 2 ** shift
    if (byte < 0x80) break
  }
  if (length > 0xffffffff) fail("Malformed", "the preamble is larger than 2^32 - 1")
  if (length > limit) failOutputLimit(limit)

  // The preamble is the exact size, so the output is allocated once
  const out = new Uint8Array(length)
  let op = 0
  while (ip < end) {
    if (op === length) fail("Malformed", "bytes are left after the data")
    const tag = input[ip++]
    const type = tag & 3
    if (type === 0) {
      let n = tag >>> 2
      if (n >= 60) {
        // 1 to 4 little-endian bytes hold len - 1
        const bytes = n - 59
        if (ip + bytes > end) truncated()
        n = input[ip]
        for (let k = 1; k < bytes; k++) n += input[ip + k] * 2 ** (8 * k)
        ip += bytes
      }
      n += 1
      if (ip + n > end) truncated()
      if (op + n > length) tooLong(length)
      if (n < 16) {
        for (let k = 0; k < n; k++) out[op + k] = input[ip + k]
      } else {
        out.set(input.subarray(ip, ip + n), op)
      }
      ip += n
      op += n
      continue
    }
    let n: number
    let offset: number
    if (type === 1) {
      if (ip >= end) truncated()
      n = ((tag >>> 2) & 7) + 4
      offset = ((tag >>> 5) << 8) | input[ip++]
    } else if (type === 2) {
      if (ip + 2 > end) truncated()
      n = (tag >>> 2) + 1
      offset = input[ip] | (input[ip + 1] << 8)
      ip += 2
    } else {
      if (ip + 4 > end) truncated()
      n = (tag >>> 2) + 1
      offset = readUint32(input, ip)
      ip += 4
    }
    if (offset === 0) fail("Malformed", "a copy has offset 0")
    if (offset > op) fail("Malformed", "a copy reaches before the start of the output")
    if (op + n > length) tooLong(length)
    let from = op - offset
    if (offset >= n && n >= 8) {
      out.copyWithin(op, from, from + n)
      op += n
    } else {
      // Byte by byte, so a copy longer than its offset repeats its own output
      const stop = op + n
      while (op < stop) out[op++] = out[from++]
    }
  }
  if (op !== length) fail("Malformed", `the data is ${op} bytes, but the preamble records ${length}`)
  return out
}
