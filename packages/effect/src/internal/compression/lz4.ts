// LZ4 block and frame formats:
// https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Block_format.md
// https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Frame_format.md
import { type Decoder, fail, failOutputLimit, Output, readUint32 } from "./failure.ts"
import { xxh32 } from "./xxhash32.ts"

const truncated = (what: string): never => fail("Truncated", `the input ends inside ${what}`)

// A block writing past `cap` breaks either the output limit or, when `cap`
// is below it, a size recorded in the frame
const overflow = (out: Output, needed: number): never =>
  needed > out.limit
    ? failOutputLimit(out.limit)
    : fail("Malformed", "a block is larger than the block maximum size or the frame content size")

// Decodes the block `src[ip, end)` onto `out`. Matches may reach back to
// `floor`, and the output may not grow past `cap`.
//
// The end-of-block rules (last 5 bytes are literals, last match starts 12
// bytes before the end) only exist for the speed of historical decoders, and
// the spec allows but does not require rejecting blocks that break them, so
// they are accepted. The block must still end right after the literals of a
// sequence: one that ends after a match misses its last sequence.
const decodeBlock = (src: Uint8Array, ip: number, end: number, out: Output, floor: number, cap: number): void => {
  let buf = out.buffer
  let op = out.length
  while (true) {
    if (ip >= end) truncated("an LZ4 block, before its last sequence")
    const token = src[ip++]
    let n = token >>> 4
    if (n === 15) {
      let b: number
      do {
        if (ip >= end) truncated("a literal length")
        b = src[ip++]
        n += b
      } while (b === 255)
    }
    if (n > 0) {
      if (n > end - ip) truncated("the literals of an LZ4 sequence")
      if (op + n > cap) overflow(out, op + n)
      if (op + n > buf.length) {
        out.length = op
        out.reserve(n)
        buf = out.buffer
      }
      if (n < 16) {
        for (let k = 0; k < n; k++) buf[op + k] = src[ip + k]
      } else {
        buf.set(src.subarray(ip, ip + n), op)
      }
      ip += n
      op += n
    }
    // The last sequence has literals only
    if (ip === end) break
    if (ip + 2 > end) truncated("a match offset")
    const offset = src[ip] | (src[ip + 1] << 8)
    ip += 2
    if (offset === 0) fail("Malformed", "a match has offset 0")
    if (offset > op - floor) fail("Malformed", "a match reaches before the start of the output")
    let m = (token & 15) + 4
    if (m === 19) {
      let b: number
      do {
        if (ip >= end) truncated("a match length")
        b = src[ip++]
        m += b
      } while (b === 255)
    }
    if (op + m > cap) overflow(out, op + m)
    if (op + m > buf.length) {
      out.length = op
      out.reserve(m)
      buf = out.buffer
    }
    const from = op - offset
    const stop = op + m
    if (m < 32) {
      // Byte by byte, so a match longer than its offset repeats its own output
      for (let k = from; op < stop;) buf[op++] = buf[k++]
    } else {
      // The data repeats every `offset` bytes, so each step can copy all of
      // it from `from` up to `op` without overlapping, doubling the run
      while (op < stop) {
        const chunk = Math.min(op - from, stop - op)
        buf.copyWithin(op, from, from + chunk)
        op += chunk
      }
    }
  }
  out.length = op
}

/** @internal */
export const lz4Block: Decoder = (input, limit, sizeHint) => {
  const out = new Output(limit, sizeHint)
  decodeBlock(input, 0, input.length, out, 0, limit)
  return out.finish()
}

const MAGIC = 0x184d2204
const LEGACY_MAGIC = 0x184c2102
const SKIPPABLE_MAGIC = 0x184d2a50

/** @internal */
export const lz4Frame: Decoder = (input, limit, sizeHint) => {
  const end = input.length
  if (end < 4) truncated("a frame magic number")
  let out: Output | undefined
  let ip = 0
  while (ip < end) {
    // Bytes after the last frame that cannot start another are not data
    if (ip + 4 > end) fail("Malformed", "bytes are left after the last frame")
    const magic = readUint32(input, ip)
    ip += 4
    if ((magic & 0xfffffff0) >>> 0 === SKIPPABLE_MAGIC) {
      if (ip + 4 > end) truncated("a skippable frame size")
      const size = readUint32(input, ip)
      ip += 4
      if (size > end - ip) truncated("a skippable frame")
      ip += size
      continue
    }
    if (magic === LEGACY_MAGIC) fail("Unsupported", "the LZ4 legacy frame format is not supported")
    if (magic !== MAGIC) fail("Malformed", `unknown frame magic number 0x${magic.toString(16)}`)

    // Frame descriptor
    const start = ip
    if (start + 2 > end) truncated("a frame descriptor")
    const flg = input[start]
    const bd = input[start + 1]
    if (flg >>> 6 !== 1) fail("Malformed", `unknown frame version ${flg >>> 6}`)
    if ((flg & 0x02) !== 0 || (bd & 0x8f) !== 0) fail("Malformed", "a reserved frame descriptor bit is set")
    const blockMaxId = (bd >>> 4) & 7
    if (blockMaxId < 4) fail("Malformed", `unknown block maximum size id ${blockMaxId}`)
    // Ids 4 to 7 are 64 KB, 256 KB, 1 MB and 4 MB
    const blockMax = 1 << (2 * blockMaxId + 8)
    const independent = (flg & 0x20) !== 0
    const blockChecksum = (flg & 0x10) !== 0
    const hasContentSize = (flg & 0x08) !== 0
    const contentChecksum = (flg & 0x04) !== 0
    const hasDictId = (flg & 0x01) !== 0
    const descriptorEnd = start + 2 + (hasContentSize ? 8 : 0) + (hasDictId ? 4 : 0)
    if (descriptorEnd >= end) truncated("a frame descriptor")
    if (((xxh32(input, start, descriptorEnd) >>> 8) & 0xff) !== input[descriptorEnd]) {
      fail("Checksum", "the frame descriptor checksum does not match")
    }
    if (hasDictId) fail("Unsupported", "LZ4 dictionaries are not supported")
    ip = descriptorEnd + 1

    const frameStart = out === undefined ? 0 : out.length
    let frameCap = limit
    if (hasContentSize) {
      // Above 2^53 the value is inexact, but still larger than any limit
      const contentSize = readUint32(input, start + 2) + readUint32(input, start + 6) * 2 ** 32
      if (contentSize > limit - frameStart) failOutputLimit(limit)
      frameCap = frameStart + contentSize
    }
    if (out === undefined) out = new Output(limit, sizeHint ?? (hasContentSize ? frameCap : undefined))

    // Data blocks, up to the EndMark
    while (true) {
      if (ip + 4 > end) truncated("a block size")
      const word = readUint32(input, ip)
      ip += 4
      if (word === 0) break
      const size = word & 0x7fffffff
      if (size > blockMax) fail("Malformed", `a block of ${size} bytes is larger than the block maximum size`)
      const dataEnd = ip + size
      const blockEnd = dataEnd + (blockChecksum ? 4 : 0)
      if (blockEnd > end) truncated("a data block")
      if (blockChecksum && xxh32(input, ip, dataEnd) !== readUint32(input, dataEnd)) {
        fail("Checksum", "a block checksum does not match")
      }
      const blockStart = out.length
      const cap = Math.min(frameCap, blockStart + blockMax)
      if (word & 0x80000000) {
        if (blockStart + size > cap) overflow(out, blockStart + size)
        out.reserve(size)
        out.buffer.set(input.subarray(ip, dataEnd), blockStart)
        out.length += size
      } else {
        // Linked blocks may match into earlier blocks of the same frame
        decodeBlock(input, ip, dataEnd, out, independent ? blockStart : frameStart, cap)
      }
      ip = blockEnd
    }

    if (contentChecksum) {
      if (ip + 4 > end) truncated("a content checksum")
      if (xxh32(out.buffer, frameStart, out.length) !== readUint32(input, ip)) {
        fail("Checksum", "the content checksum does not match")
      }
      ip += 4
    }
    if (hasContentSize && out.length !== frameCap) {
      fail(
        "Malformed",
        `the frame holds ${out.length - frameStart} bytes, but its header records ${frameCap - frameStart}`
      )
    }
  }
  return out === undefined ? new Uint8Array(0) : out.finish()
}
