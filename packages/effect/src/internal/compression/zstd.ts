// Zstandard decoder, RFC 8878: https://www.rfc-editor.org/rfc/rfc8878
//
// The whole output is kept in memory, so every earlier byte of a frame stays
// addressable and the window only limits how far back a match may reach.
import { type Decoder, fail, Output, readUint32 } from "./failure.ts"
import { xxhash64 } from "./xxhash64.ts"

const FRAME_MAGIC = 0xFD2FB528
// Skippable frames use 0x184D2A50..0x184D2A5F (§3.1.2)
const SKIPPABLE_MAGIC = 0x184D2A5
const MAX_BLOCK_SIZE = 128 * 1024

// Literals length codes (§3.1.1.3.2.1.1, Table 16)
// dprint-ignore
const LL_BASE = Uint32Array.of(
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 18, 20, 22, 24, 28, 32, 40, 48, 64, 128, 256, 512, 1024, 2048, 4096,
  8192, 16384, 32768, 65536
)
// dprint-ignore
const LL_BITS = Uint8Array.of(
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 2, 2, 3, 3, 4, 6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16
)
// Match length codes (§3.1.1.3.2.1.1, Table 17)
// dprint-ignore
const ML_BASE = Uint32Array.of(
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
  35, 37, 39, 41, 43, 47, 51, 59, 67, 83, 99, 131, 259, 515, 1027, 2051,
  4099, 8195, 16387, 32771, 65539
)
// dprint-ignore
const ML_BITS = Uint8Array.of(
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16
)

// Default distributions (§3.1.1.3.2.2)
// dprint-ignore
const LL_DEFAULT = Int16Array.of(
  4, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 1, 1, 1, 1, 1,
  -1, -1, -1, -1
)
// dprint-ignore
const ML_DEFAULT = Int16Array.of(
  1, 4, 3, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, -1,
  -1, -1, -1, -1, -1
)
// dprint-ignore
const OF_DEFAULT = Int16Array.of(
  1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1
)

// Shared scratch for table construction; decoding is synchronous, so one
// copy is enough
const norm = new Int16Array(256)
const symbolNext = new Uint16Array(256)
const weights = new Uint8Array(256)
const rankStart = new Uint32Array(13)

/**
 * An FSE decoding table (§4.1) for symbols up to `maxSymbol` and accuracy
 * logs up to `maxLog`. Each entry packs
 * `baseline << 16 | numberOfBits << 8 | symbol`.
 */
class FseTable {
  readonly maxSymbol: number
  readonly maxLog: number
  readonly own: Uint32Array
  // The table in use: `own`, a predefined table, or undefined before the
  // first one in the frame
  table: Uint32Array | undefined = undefined
  log = 0
  constructor(maxSymbol: number, maxLog: number) {
    this.maxSymbol = maxSymbol
    this.maxLog = maxLog
    this.own = new Uint32Array(1 << maxLog)
  }
}

// Builds the decoding table for the distribution in `norm` (§4.1.1)
const buildFse = (symbols: number, log: number, table: Uint32Array): void => {
  const size = 1 << log
  let high = size - 1
  for (let s = 0; s < symbols; s++) {
    if (norm[s] === -1) {
      // "Less than 1" symbols take the last cells and reset the state fully
      table[high--] = s
      symbolNext[s] = 1
    } else {
      symbolNext[s] = norm[s]
    }
  }
  const step = (size >>> 1) + (size >>> 3) + 3
  const mask = size - 1
  let position = 0
  for (let s = 0; s < symbols; s++) {
    for (let i = 0; i < norm[s]; i++) {
      table[position] = s
      do {
        position = (position + step) & mask
      } while (position > high)
    }
  }
  if (position !== 0) fail("Malformed", "invalid FSE distribution")
  for (let u = 0; u < size; u++) {
    const s = table[u]
    const next = symbolNext[s]++
    const bits = log - (31 - Math.clz32(next))
    table[u] = (((next << bits) - size) << 16) | (bits << 8) | s
  }
}

const predefined = (distribution: Int16Array, log: number): Uint32Array => {
  norm.set(distribution)
  const table = new Uint32Array(1 << log)
  buildFse(distribution.length, log, table)
  return table
}

// The predefined tables (§3.1.1.3.2.2), built on first use
let LL_PREDEFINED: Uint32Array | undefined
let OF_PREDEFINED: Uint32Array | undefined
let ML_PREDEFINED: Uint32Array | undefined
const llPredefined = (): Uint32Array => LL_PREDEFINED ??= predefined(LL_DEFAULT, 6)
const ofPredefined = (): Uint32Array => OF_PREDEFINED ??= predefined(OF_DEFAULT, 5)
const mlPredefined = (): Uint32Array => ML_PREDEFINED ??= predefined(ML_DEFAULT, 6)

// Bits `[bit, bit + n)` of the forward bitstream starting at `start`; bytes
// at or past `end` read as zero (n <= 16)
const forwardBits = (input: Uint8Array, start: number, end: number, bit: number, n: number): number => {
  const i = start + (bit >>> 3)
  const v = (i < end ? input[i] : 0) | (i + 1 < end ? input[i + 1] << 8 : 0) | (i + 2 < end ? input[i + 2] << 16 : 0)
  return (v >>> (bit & 7)) & ((1 << n) - 1)
}

// Reads an FSE table description (§4.1.1) at `start` into `slot` and
// returns the position after it
const readFse = (input: Uint8Array, start: number, end: number, slot: FseTable): number => {
  const maxSymbol = slot.maxSymbol
  const totalBits = (end - start) * 8
  const log = forwardBits(input, start, end, 0, 4) + 5
  if (log > slot.maxLog) fail("Malformed", `FSE accuracy log ${log} is larger than ${slot.maxLog}`)
  let bit = 4
  let remaining = (1 << log) + 1
  let threshold = 1 << log
  let bits = log + 1
  let symbol = 0
  while (remaining > 1) {
    if (symbol > maxSymbol) fail("Malformed", "too many symbols in FSE distribution")
    const max = 2 * threshold - 1 - remaining
    let value = forwardBits(input, start, end, bit, bits - 1)
    if (value < max) {
      bit += bits - 1
    } else {
      value = forwardBits(input, start, end, bit, bits)
      if (value >= threshold) value -= max
      bit += bits
    }
    const probability = value - 1
    remaining -= probability < 0 ? -probability : probability
    norm[symbol++] = probability
    if (probability === 0) {
      // 2-bit repeat flags give the number of further zero probabilities
      let flag: number
      do {
        flag = forwardBits(input, start, end, bit, 2)
        bit += 2
        if (symbol + flag > maxSymbol + 1) fail("Malformed", "too many symbols in FSE distribution")
        for (let i = 0; i < flag; i++) norm[symbol++] = 0
      } while (flag === 3 && bit <= totalBits)
    }
    if (bit > totalBits) fail("Malformed", "FSE distribution is larger than its section")
    if (remaining < 1) fail("Malformed", "FSE probabilities exceed the table size")
    while (remaining < threshold) {
      bits--
      threshold >>>= 1
    }
  }
  buildFse(symbol, log, slot.own)
  slot.table = slot.own
  slot.log = log
  return start + ((bit + 7) >>> 3)
}

/**
 * Reads a bitstream backwards from its end marker (§3.1.1.3.2.1.2). Reads
 * past the start yield zero bits and are counted, so callers can check that
 * the stream was consumed exactly.
 */
class BackwardBits {
  private readonly input: Uint8Array
  private readonly start: number
  private next: number
  private container: number
  private bits: number
  private phantom = 0
  constructor(input: Uint8Array, start: number, end: number) {
    if (end <= start) fail("Malformed", "empty bitstream")
    const last = input[end - 1]
    if (last === 0) fail("Malformed", "bitstream without end marker")
    this.input = input
    this.start = start
    this.next = end - 2
    this.container = last
    this.bits = 31 - Math.clz32(last)
  }
  // Up to 25 bits; kept small so it gets inlined
  read(n: number): number {
    if (this.bits < n) this.refill()
    this.bits -= n
    return (this.container >>> this.bits) & ((1 << n) - 1)
  }
  private refill(): void {
    while (this.bits <= 24) {
      if (this.next >= this.start) {
        this.container = (this.container << 8) | this.input[this.next--]
      } else {
        this.container <<= 8
        this.phantom += 8
      }
      this.bits += 8
    }
  }
  // Bits left unread; negative after reading past the start
  remaining(): number {
    return (this.next - this.start + 1) * 8 + this.bits - this.phantom
  }
}

class ZstdDecoder {
  readonly input: Uint8Array
  readonly limit: number
  readonly sizeHint: number | undefined
  out: Output | undefined = undefined
  // Frame state
  frameStart = 0
  windowSize = 0
  blockMax = 0
  rep1 = 1
  rep2 = 4
  rep3 = 8
  huffman: Uint16Array | undefined = undefined
  huffmanLog = 0
  // The largest symbol and accuracy log each table accepts (§3.1.1.3.2.1,
  // §4.2.1.2)
  readonly ll = new FseTable(35, 9)
  readonly of = new FseTable(31, 8)
  readonly ml = new FseTable(52, 9)
  readonly weightTable = new FseTable(11, 6)
  literals = new Uint8Array(0)

  constructor(input: Uint8Array, limit: number, sizeHint: number | undefined) {
    this.input = input
    this.limit = limit
    this.sizeHint = sizeHint
  }

  // Decodes the frame whose header starts at `pos` (after the magic number)
  // and returns the position after it (§3.1.1)
  frame(pos: number): number {
    const input = this.input
    const length = input.length
    if (pos >= length) fail("Truncated", "the input ends inside a frame header")
    const descriptor = input[pos++]
    if (descriptor & 0x08) fail("Malformed", "the reserved bit of the frame header is set")
    const singleSegment = (descriptor >>> 5) & 1
    const hasChecksum = (descriptor >>> 2) & 1
    const dictionaryIdSize = [0, 1, 2, 4][descriptor & 3]
    const fcsFlag = descriptor >>> 6
    const fcsSize = fcsFlag === 0 ? singleSegment : 1 << fcsFlag
    if (length - pos < 1 - singleSegment + dictionaryIdSize + fcsSize) {
      fail("Truncated", "the input ends inside a frame header")
    }
    let windowSize = 0
    if (!singleSegment) {
      const exponent = input[pos] >>> 3
      const base = 2 ** (10 + exponent)
      windowSize = base + (base / 8) * (input[pos] & 7)
      pos++
    }
    let dictionaryId = 0
    for (let i = 0; i < dictionaryIdSize; i++) dictionaryId += input[pos++] * 2 ** (8 * i)
    if (dictionaryId !== 0) fail("Unsupported", `the frame needs dictionary ${dictionaryId}`)
    let contentSize = -1
    if (fcsSize > 0) {
      contentSize = 0
      for (let i = 0; i < fcsSize; i++) contentSize += input[pos++] * 2 ** (8 * i)
      if (fcsSize === 2) contentSize += 256
      if (singleSegment) windowSize = contentSize
    }

    let out = this.out
    const written = out === undefined ? 0 : out.length
    if (contentSize > this.limit - written) {
      fail("OutputLimit", `the frame content size ${contentSize} is larger than the limit of ${this.limit} bytes`)
    }
    if (out === undefined) {
      out = this.out = new Output(this.limit, this.sizeHint ?? (contentSize >= 0 ? contentSize : undefined))
    } else if (contentSize > 0) {
      out.reserve(contentSize)
    }

    this.frameStart = out.length
    this.windowSize = windowSize
    this.blockMax = Math.min(windowSize, MAX_BLOCK_SIZE)
    this.rep1 = 1
    this.rep2 = 4
    this.rep3 = 8
    this.huffmanLog = 0
    this.ll.table = this.of.table = this.ml.table = undefined

    let last = 0
    while (!last) {
      if (length - pos < 3) fail("Truncated", "the input ends inside a block header")
      const header = input[pos] | (input[pos + 1] << 8) | (input[pos + 2] << 16)
      pos += 3
      last = header & 1
      const type = (header >>> 1) & 3
      const size = header >>> 3
      if (type === 3) fail("Malformed", "reserved block type")
      if (size > this.blockMax) {
        fail("Malformed", `block size ${size} is larger than the maximum of ${this.blockMax}`)
      }
      if (type === 1) {
        if (pos >= length) fail("Truncated", "the input ends inside a block")
        out.reserve(size)
        out.buffer.fill(input[pos], out.length, out.length + size)
        out.length += size
        pos++
      } else {
        if (length - pos < size) fail("Truncated", "the input ends inside a block")
        if (type === 0) {
          out.reserve(size)
          out.buffer.set(input.subarray(pos, pos + size), out.length)
          out.length += size
        } else {
          this.compressedBlock(pos, pos + size)
        }
        pos += size
      }
      if (contentSize >= 0 && out.length - this.frameStart > contentSize) {
        fail("Malformed", `the frame is larger than its content size of ${contentSize} bytes`)
      }
    }
    if (contentSize >= 0 && out.length - this.frameStart !== contentSize) {
      fail("Malformed", `the frame is smaller than its content size of ${contentSize} bytes`)
    }
    if (hasChecksum) {
      if (length - pos < 4) fail("Truncated", "the input ends inside a content checksum")
      if (xxhash64(out.buffer.subarray(this.frameStart, out.length)).low !== readUint32(input, pos)) {
        fail("Checksum", "content checksum mismatch")
      }
      pos += 4
    }
    return pos
  }

  // Decodes the compressed block in [start, end) (§3.1.1.3)
  compressedBlock(start: number, end: number): void {
    const input = this.input
    let pos = start
    if (pos >= end) fail("Malformed", "empty compressed block")
    const b0 = input[pos]
    const literalsType = b0 & 3
    const sizeFormat = (b0 >>> 2) & 3
    let literals: Uint8Array
    let literalsStart = 0
    let literalsSize: number
    if (literalsType < 2) {
      // Raw or RLE literals (§3.1.1.3.1.1)
      if (sizeFormat === 1) {
        if (end - pos < 2) fail("Malformed", "literals section header is larger than the block")
        literalsSize = (b0 >>> 4) + (input[pos + 1] << 4)
        pos += 2
      } else if (sizeFormat === 3) {
        if (end - pos < 3) fail("Malformed", "literals section header is larger than the block")
        literalsSize = (b0 >>> 4) + (input[pos + 1] << 4) + (input[pos + 2] << 12)
        pos += 3
      } else {
        literalsSize = b0 >>> 3
        pos++
      }
      if (literalsSize > this.blockMax) fail("Malformed", "literals are larger than the maximum block size")
      if (literalsType === 0) {
        if (end - pos < literalsSize) fail("Malformed", "raw literals are larger than the block")
        literals = input
        literalsStart = pos
        pos += literalsSize
      } else {
        if (pos >= end) fail("Malformed", "RLE literals are larger than the block")
        literals = this.literalsBuffer(literalsSize)
        literals.fill(input[pos], 0, literalsSize)
        pos++
      }
    } else {
      // Huffman-coded literals (§3.1.1.3.1.4)
      const headerSize = sizeFormat < 2 ? 3 : sizeFormat + 2
      if (end - pos < headerSize) fail("Malformed", "literals section header is larger than the block")
      let compressedSize: number
      if (headerSize === 3) {
        const v = b0 | (input[pos + 1] << 8) | (input[pos + 2] << 16)
        literalsSize = (v >>> 4) & 0x3FF
        compressedSize = v >>> 14
      } else if (headerSize === 4) {
        const v = readUint32(input, pos)
        literalsSize = (v >>> 4) & 0x3FFF
        compressedSize = v >>> 18
      } else {
        literalsSize = ((b0 >>> 4) | (input[pos + 1] << 4) | (input[pos + 2] << 12)) & 0x3FFFF
        compressedSize = (input[pos + 2] >>> 6) | (input[pos + 3] << 2) | (input[pos + 4] << 10)
      }
      pos += headerSize
      if (literalsSize > this.blockMax) fail("Malformed", "literals are larger than the maximum block size")
      if (end - pos < compressedSize) fail("Malformed", "compressed literals are larger than the block")
      const literalsEnd = pos + compressedSize
      if (literalsType === 2) {
        pos = this.huffmanTree(pos, literalsEnd)
      } else if (this.huffmanLog === 0) {
        fail("Malformed", "treeless literals without a previous Huffman table")
      }
      literals = this.literalsBuffer(literalsSize)
      if (sizeFormat === 0) {
        this.huffmanStream(pos, literalsEnd, literals, 0, literalsSize)
      } else {
        // Four streams behind a jump table (§3.1.1.3.1.6)
        if (literalsEnd - pos < 6) fail("Malformed", "jump table is larger than the literals section")
        const size1 = input[pos] | (input[pos + 1] << 8)
        const size2 = input[pos + 2] | (input[pos + 3] << 8)
        const size3 = input[pos + 4] | (input[pos + 5] << 8)
        pos += 6
        if (size1 + size2 + size3 > literalsEnd - pos) fail("Malformed", "jump table exceeds the literals section")
        const segment = (literalsSize + 3) >>> 2
        if (3 * segment > literalsSize) fail("Malformed", "too few literals for four streams")
        this.huffmanStream(pos, pos + size1, literals, 0, segment)
        pos += size1
        this.huffmanStream(pos, pos + size2, literals, segment, segment)
        pos += size2
        this.huffmanStream(pos, pos + size3, literals, 2 * segment, segment)
        pos += size3
        this.huffmanStream(pos, literalsEnd, literals, 3 * segment, literalsSize - 3 * segment)
      }
      pos = literalsEnd
    }
    this.sequences(pos, end, literals, literalsStart, literalsStart + literalsSize)
  }

  literalsBuffer(size: number): Uint8Array {
    if (this.literals.length < size) {
      this.literals = new Uint8Array(Math.min(this.blockMax, Math.max(size, this.literals.length * 2)))
    }
    return this.literals
  }

  // Reads a Huffman tree description (§4.2.1) and returns the position after it
  huffmanTree(pos: number, end: number): number {
    const input = this.input
    if (pos >= end) fail("Malformed", "missing Huffman tree description")
    const header = input[pos++]
    let count: number
    if (header >= 128) {
      // Direct representation: 4-bit weights, high nibble first
      count = header - 127
      const bytes = (count + 1) >>> 1
      if (end - pos < bytes) fail("Malformed", "Huffman weights are larger than the literals section")
      for (let i = 0; i < count; i++) {
        const byte = input[pos + (i >>> 1)]
        weights[i] = i & 1 ? byte & 15 : byte >>> 4
      }
      pos += bytes
    } else {
      if (end - pos < header) fail("Malformed", "Huffman weights are larger than the literals section")
      count = this.fseWeights(pos, pos + header)
      pos += header
    }

    // The last weight completes the sum to a power of two (§4.2.1)
    let sum = 0
    for (let i = 0; i < count; i++) {
      if (weights[i] > 0) sum += 2 ** (weights[i] - 1)
    }
    if (sum === 0) fail("Malformed", "all Huffman weights are zero")
    const maxBits = 32 - Math.clz32(sum)
    if (maxBits > 11) fail("Malformed", "Huffman codes are longer than 11 bits")
    const left = (1 << maxBits) - sum
    if ((left & (left - 1)) !== 0) fail("Malformed", "Huffman weights do not form a complete tree")
    weights[count++] = 32 - Math.clz32(left)

    // Codes are assigned from the lowest weight up, by symbol within a
    // weight (§4.2.1.3); a code of weight w fills 2^(w-1) table entries
    rankStart.fill(0)
    for (let i = 0; i < count; i++) {
      if (weights[i] > 0) rankStart[weights[i]] += 1 << (weights[i] - 1)
    }
    let next = 0
    for (let w = 1; w <= maxBits; w++) {
      const n = rankStart[w]
      rankStart[w] = next
      next += n
    }
    const table = this.huffman ??= new Uint16Array(1 << 11)
    for (let s = 0; s < count; s++) {
      const w = weights[s]
      if (w === 0) continue
      const from = rankStart[w]
      const to = from + (1 << (w - 1))
      table.fill((s << 4) | (maxBits + 1 - w), from, to)
      rankStart[w] = to
    }
    this.huffmanLog = maxBits
    return pos
  }

  // FSE-compressed Huffman weights (§4.2.1.2); returns the number decoded
  fseWeights(start: number, end: number): number {
    const slot = this.weightTable
    const pos = readFse(this.input, start, end, slot)
    const table = slot.own
    const log = slot.log
    const bits = new BackwardBits(this.input, pos, end)
    let state = bits.read(log)
    let other = bits.read(log)
    // Missing bits read as zero only when a state is updated, not when the
    // states are initialized (§4.1, §4.2.1.2)
    if (bits.remaining() < 0) fail("Malformed", "the Huffman weights stream is shorter than its initial states")
    let count = 0
    // The two states take turns until updating one would overflow the
    // stream; the other state's symbol is then the last one
    for (;;) {
      if (count > 253) fail("Malformed", "too many Huffman weights")
      const entry = table[state]
      weights[count++] = entry & 0xFF
      const updated = (entry >>> 16) + bits.read((entry >>> 8) & 0xFF)
      if (bits.remaining() < 0) break
      state = other
      other = updated
    }
    weights[count++] = table[other] & 0xFF
    return count
  }

  // Decodes `count` literals from the Huffman stream in [start, end) (§4.2.2)
  huffmanStream(start: number, end: number, dst: Uint8Array, offset: number, count: number): void {
    const input = this.input
    if (end <= start) fail("Malformed", "empty Huffman stream")
    const lastByte = input[end - 1]
    if (lastByte === 0) fail("Malformed", "Huffman stream without end marker")
    const table = this.huffman!
    const log = this.huffmanLog
    const mask = (1 << log) - 1
    // Same scheme as BackwardBits, inlined for the hot loop
    let container = lastByte
    let bits = 31 - Math.clz32(lastByte)
    let next = end - 2
    let phantom = 0
    for (let i = offset, stop = offset + count; i < stop; i++) {
      if (bits < log) {
        while (bits <= 24) {
          if (next >= start) {
            container = (container << 8) | input[next--]
          } else {
            container <<= 8
            phantom += 8
          }
          bits += 8
        }
      }
      const entry = table[(container >>> (bits - log)) & mask]
      dst[i] = entry >>> 4
      bits -= entry & 15
    }
    if ((next - start + 1) * 8 + bits - phantom !== 0) fail("Malformed", "Huffman stream not consumed exactly")
  }

  // Reads the table for one sequence symbol type (§3.1.1.3.2.1) and returns
  // the position after its description
  sequenceTable(
    mode: number,
    pos: number,
    end: number,
    slot: FseTable,
    predefined: () => Uint32Array,
    predefinedLog: number
  ): number {
    switch (mode) {
      case 0: {
        slot.table = predefined()
        slot.log = predefinedLog
        return pos
      }
      case 1: {
        if (pos >= end) fail("Malformed", "missing RLE symbol")
        const symbol = this.input[pos]
        if (symbol > slot.maxSymbol) fail("Malformed", `RLE symbol ${symbol} is out of range`)
        slot.own[0] = symbol
        slot.table = slot.own
        slot.log = 0
        return pos + 1
      }
      case 2:
        return readFse(this.input, pos, end, slot)
      default: {
        if (slot.table === undefined) fail("Malformed", "repeat mode without a previous table")
        return pos
      }
    }
  }

  // Decodes the sequences section and executes the sequences (§3.1.1.3.2,
  // §3.1.1.4)
  sequences(pos: number, end: number, literals: Uint8Array, literalStart: number, literalEnd: number): void {
    const input = this.input
    const out = this.out!
    const blockStart = out.length
    if (pos >= end) fail("Malformed", "missing sequences section")
    let count = input[pos++]
    if (count === 0) {
      if (pos !== end) fail("Malformed", "bytes after an empty sequences section")
    } else {
      if (count === 255) {
        if (end - pos < 2) fail("Malformed", "sequences section header is larger than the block")
        count = input[pos] + (input[pos + 1] << 8) + 0x7F00
        pos += 2
      } else if (count >= 128) {
        if (pos >= end) fail("Malformed", "sequences section header is larger than the block")
        count = ((count - 128) << 8) + input[pos++]
      }
      if (pos >= end) fail("Malformed", "sequences section header is larger than the block")
      const modes = input[pos++]
      if (modes & 3) fail("Malformed", "reserved bits of the symbol compression modes are set")
      const ll = this.ll, of = this.of, ml = this.ml
      pos = this.sequenceTable(modes >>> 6, pos, end, ll, llPredefined, 6)
      pos = this.sequenceTable((modes >>> 4) & 3, pos, end, of, ofPredefined, 5)
      pos = this.sequenceTable((modes >>> 2) & 3, pos, end, ml, mlPredefined, 6)
      const llTable = ll.table!, ofTable = of.table!, mlTable = ml.table!

      // The bitstream reader of BackwardBits, inlined into locals for the hot
      // loop. `next` keeps counting down past the start, so reading too far
      // shows up as a negative bit count at the end.
      if (end <= pos) fail("Malformed", "empty bitstream")
      const lastByte = input[end - 1]
      if (lastByte === 0) fail("Malformed", "bitstream without end marker")
      let container = lastByte
      let bits = 31 - Math.clz32(lastByte)
      let next = end - 2
      while (bits <= 24) {
        container = (container << 8) | (next >= pos ? input[next] : 0)
        next--
        bits += 8
      }
      bits -= ll.log
      let llState = (container >>> bits) & ((1 << ll.log) - 1)
      bits -= of.log
      let ofState = (container >>> bits) & ((1 << of.log) - 1)
      while (bits <= 24) {
        container = (container << 8) | (next >= pos ? input[next] : 0)
        next--
        bits += 8
      }
      bits -= ml.log
      let mlState = (container >>> bits) & ((1 << ml.log) - 1)
      const frameStart = this.frameStart
      const windowSize = this.windowSize
      const blockEnd = blockStart + this.blockMax
      let rep1 = this.rep1, rep2 = this.rep2, rep3 = this.rep3
      let literal = literalStart
      for (let i = 0; i < count; i++) {
        const llEntry = llTable[llState]
        const ofEntry = ofTable[ofState]
        const mlEntry = mlTable[mlState]
        // Extra bits come in the order offset, match length, literals length;
        // each read is preceded by a refill to at least 25 bits
        const ofCode = ofEntry & 0xFF
        while (bits <= 24) {
          container = (container << 8) | (next >= pos ? input[next] : 0)
          next--
          bits += 8
        }
        let offsetValue: number
        if (ofCode <= 25) {
          bits -= ofCode
          offsetValue = (1 << ofCode) + ((container >>> bits) & ((1 << ofCode) - 1))
        } else {
          bits -= ofCode - 16
          offsetValue = 2 ** ofCode + ((container >>> bits) & ((1 << (ofCode - 16)) - 1)) * 0x10000
          while (bits <= 24) {
            container = (container << 8) | (next >= pos ? input[next] : 0)
            next--
            bits += 8
          }
          bits -= 16
          offsetValue += (container >>> bits) & 0xFFFF
        }
        while (bits <= 24) {
          container = (container << 8) | (next >= pos ? input[next] : 0)
          next--
          bits += 8
        }
        const mlCode = mlEntry & 0xFF
        const mlBits = ML_BITS[mlCode]
        bits -= mlBits
        const matchLength = ML_BASE[mlCode] + ((container >>> bits) & ((1 << mlBits) - 1))
        while (bits <= 24) {
          container = (container << 8) | (next >= pos ? input[next] : 0)
          next--
          bits += 8
        }
        const llCode = llEntry & 0xFF
        const llBits = LL_BITS[llCode]
        bits -= llBits
        const literalLength = LL_BASE[llCode] + ((container >>> bits) & ((1 << llBits) - 1))

        // Repeat offsets (§3.1.1.5)
        let offset: number
        if (offsetValue > 3) {
          offset = offsetValue - 3
          rep3 = rep2
          rep2 = rep1
          rep1 = offset
        } else {
          const index = literalLength === 0 ? offsetValue : offsetValue - 1
          if (index === 0) {
            offset = rep1
          } else if (index === 1) {
            offset = rep2
            rep2 = rep1
            rep1 = offset
          } else if (index === 2) {
            offset = rep3
            rep3 = rep2
            rep2 = rep1
            rep1 = offset
          } else {
            offset = rep1 - 1
            if (offset === 0) fail("Malformed", "repeat offset of zero")
            rep3 = rep2
            rep2 = rep1
            rep1 = offset
          }
        }

        if (i + 1 < count) {
          // States update in the order literals length, match length, offset
          while (bits <= 24) {
            container = (container << 8) | (next >= pos ? input[next] : 0)
            next--
            bits += 8
          }
          let n = (llEntry >>> 8) & 0xFF
          bits -= n
          llState = (llEntry >>> 16) + ((container >>> bits) & ((1 << n) - 1))
          n = (mlEntry >>> 8) & 0xFF
          bits -= n
          mlState = (mlEntry >>> 16) + ((container >>> bits) & ((1 << n) - 1))
          while (bits <= 24) {
            container = (container << 8) | (next >= pos ? input[next] : 0)
            next--
            bits += 8
          }
          n = (ofEntry >>> 8) & 0xFF
          bits -= n
          ofState = (ofEntry >>> 16) + ((container >>> bits) & ((1 << n) - 1))
        }

        // Execute the sequence (§3.1.1.4)
        if (literalLength > literalEnd - literal) fail("Malformed", "sequence uses more literals than decoded")
        let o = out.length
        const total = literalLength + matchLength
        if (total > blockEnd - o) fail("Malformed", "block is larger than the maximum block size")
        out.reserve(total)
        const buffer = out.buffer
        if (literalLength > 32) {
          buffer.set(literals.subarray(literal, literal + literalLength), o)
        } else {
          for (let k = 0; k < literalLength; k++) buffer[o + k] = literals[literal + k]
        }
        literal += literalLength
        o += literalLength
        if (offset > o - frameStart) fail("Malformed", "match offset reaches before the start of the frame")
        if (offset > windowSize) fail("Malformed", "match offset is larger than the window size")
        const from = o - offset
        if (offset >= matchLength && matchLength > 32) {
          buffer.copyWithin(o, from, from + matchLength)
        } else {
          // Overlapping matches repeat the last `offset` bytes
          for (let k = 0; k < matchLength; k++) buffer[o + k] = buffer[from + k]
        }
        out.length = o + matchLength
      }
      if ((next - pos + 1) * 8 + bits !== 0) fail("Malformed", "sequences bitstream not consumed exactly")
      this.rep1 = rep1
      this.rep2 = rep2
      this.rep3 = rep3
      literalStart = literal
    }
    // Literals left after the last sequence end the block
    const rest = literalEnd - literalStart
    if (out.length + rest - blockStart > this.blockMax) fail("Malformed", "block is larger than the maximum block size")
    out.reserve(rest)
    out.buffer.set(literals.subarray(literalStart, literalEnd), out.length)
    out.length += rest
  }
}

/** @internal */
export const zstd: Decoder = (input, limit, sizeHint) => {
  const length = input.length
  if (length < 4) fail("Truncated", "the input ends before the first magic number")
  const decoder = new ZstdDecoder(input, limit, sizeHint)
  let pos = 0
  while (pos < length) {
    if (length - pos < 4) fail("Malformed", "trailing bytes after the last frame")
    const magic = readUint32(input, pos)
    if (magic === FRAME_MAGIC) {
      pos = decoder.frame(pos + 4)
    } else if (magic >>> 4 === SKIPPABLE_MAGIC) {
      // Skippable frame (§3.1.2)
      if (length - pos < 8) fail("Truncated", "the input ends inside a skippable frame header")
      const size = readUint32(input, pos + 4)
      if (length - pos - 8 < size) fail("Truncated", "the input ends inside a skippable frame")
      pos += 8 + size
    } else {
      fail("Malformed", pos === 0 ? "unknown magic number" : "trailing bytes after the last frame")
    }
  }
  return decoder.out === undefined ? new Uint8Array(0) : decoder.out.finish()
}
