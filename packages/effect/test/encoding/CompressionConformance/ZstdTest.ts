/**
 * Conformance of `Compression.decompressZstd` to the Zstandard format.
 *
 * Specification: RFC 8878, "Zstandard Compression and the 'application/zstd'
 * Media Type", February 2021 (https://www.rfc-editor.org/rfc/rfc8878).
 * Section numbers in comments are the RFC's; field names in test titles
 * (Frame_Content_Size, Block_Maximum_Size, ...) are the spec's.
 *
 * The fixture files and the inline reference frames come from
 * `test/fixtures/compression/zstd/generate.py` (python-zstandard 0.25.0
 * bundling libzstd 1.5.7). They are interoperability evidence, not a
 * replacement for the assertion tests. Malformed input and features the
 * reference encoder rarely emits for small inputs (RLE and Repeat_Mode tables,
 * direct Huffman weights, every Frame_Content_Size width, skippable frames)
 * are hand-crafted; the valid hand-crafted frames were also checked against
 * libzstd 1.5.7.
 *
 * Not covered:
 * - Dictionaries (§3.1.1.1.3, §5, §6): not supported. A frame with a non-zero
 *   Dictionary_ID fails with `Unsupported`, so dictionary decoding is untested.
 * - Decoder memory guidance (§3.1.1.1.2, "at least 8 MB"): the whole output
 *   is kept in memory, so the output is bounded by `maxOutputSize` and
 *   Window_Size only bounds match offsets.
 * - Encoder requirements (Unused_Bit set to zero, block splitting, choice of
 *   modes): apply to compressors.
 * - Media type and IANA registrations (§7): not part of decoding.
 * - Decoder policy, not spec requirements: checksums are always verified (the
 *   spec lets a decoder skip them), a frame whose output differs from its
 *   Frame_Content_Size fails with `Malformed`, bytes after the last frame
 *   that do not form a frame fail with `Malformed`, empty input fails with
 *   `Truncated`, a Dictionary_ID field of 0 means no dictionary (as in
 *   libzstd). Four Huffman streams need only as many literals as
 *   §3.1.1.3.1.6 allows (libzstd also requires at least 6).
 * - Compatibility exceptions, where the decoder accepts input the RFC's
 *   wording excludes, to match libzstd 1.5.7. They are tested as deviations,
 *   not as conformance, and are pending a decision on EFF-3821:
 *   - a match offset equal to Window_Size (§3.1.1.4 says offsets "must be
 *     smaller than Window_Size"; libzstd's encoder emits them);
 *   - an FSE distribution with a single symbol, in FSE_Compressed_Mode
 *     (§4.1.1 "two or more symbols with nonzero probability",
 *     §3.1.1.3.2.1 "must not be used when only one symbol is present").
 *     For Huffman weights such a table never reaches the end of its stream,
 *     so it still fails with `Malformed`.
 */
import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Compression from "effect/encoding/Compression"
import { ascii, assertions, type Bytes, concat, fixture, hex, le } from "./CompressionConformance.ts"

// The deterministic generators of generate.py
const lcg = (seed: number): () => number => {
  let state = seed
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff
    return state >>> 16
  }
}
const WORDS = "the quick brown fox jumps over lazy dog zstd frame block literal sequence offset match window".split(" ")
const text = (size: number, seed: number): Uint8Array => {
  const rand = lcg(seed)
  let s = ""
  for (let count = 1; s.length < size; count++) s += WORDS[rand() & 15] + (count % 12 === 0 ? "\n" : " ")
  return ascii(s.slice(0, size))
}
const randomBytes = (size: number, seed: number): Uint8Array => {
  const rand = lcg(seed)
  return Uint8Array.from({ length: size }, () => rand() & 0xff)
}
const letters = (size: number, alphabet: Uint8Array, seed: number): Uint8Array => {
  const rand = lcg(seed)
  return Uint8Array.from({ length: size }, () => alphabet[rand() % alphabet.length])
}
const edited = (chunk: Uint8Array, copies: number, every: number, seed: number): Uint8Array => {
  const rand = lcg(seed)
  const out: Array<Uint8Array> = []
  for (let i = 0; i < copies; i++) {
    const copy = chunk.slice()
    for (let start = 0; start < copy.length; start += every) {
      const letter = 0x61 + rand() % 26
      copy[(start + rand()) % copy.length] = letter
    }
    out.push(copy)
  }
  return concat(...out)
}

// Reference frames from generate.py
const EMPTY = hex("28b52ffd240001000099e9d851")
const HELLO = hex("28b52ffd24176500003068656c6c6f200100994b11175eae0d")
const HELLO_NO_CHECKSUM = hex("28b52ffd20176500003068656c6c6f200100994b11")
// "hello ", a skippable frame, then "world" without Frame_Content_Size
const CONCATENATED = hex(
  "28b52ffd200631000068656c6c6f205e2a4d180300000078797a28b52ffd0400290000776f726c64ef51ee66"
)
// Content_Checksum of "hello xxx"
const CHECKSUM_HELLO_XXX = hex("c6f2b848")

const MAGIC = le(0xfd2fb528, 4)
const frame = (header: Bytes, ...blocks: ReadonlyArray<Bytes>): Uint8Array => concat(MAGIC, header, ...blocks)
const skippable = (nibble: number, data: Bytes): Uint8Array =>
  concat(le(0x184d2a50 + nibble, 4), le(data.length, 4), data)

// Frame headers (§3.1.1.1): a Frame_Header_Descriptor and its fields
// Single_Segment_Flag with a 1-byte Frame_Content_Size
const singleSegment = (size: number): Array<number> => [0x20, size]
// No Frame_Content_Size; Window_Size from the Window_Descriptor byte
const windowed = (descriptor: number): Array<number> => [0x00, descriptor]
const WINDOW_1KB = windowed(0x00)
const WINDOW_128KB = windowed(0x38)

// Block_Header (§3.1.1.2): Last_Block, Block_Type, Block_Size
const blockHeader = (type: number, size: number, last: boolean): Array<number> =>
  le(size * 8 + type * 2 + (last ? 1 : 0), 3)
const rawBlock = (data: Bytes, last = true): Uint8Array => concat(blockHeader(0, data.length, last), data)
const rleBlock = (byte: number, size: number, last = true): Array<number> => [...blockHeader(1, size, last), byte]
const compressedBlock = (literals: Bytes, sequences: Bytes, last = true): Uint8Array =>
  concat(blockHeader(2, literals.length + sequences.length, last), literals, sequences)

// Literals_Section_Header (§3.1.1.3.1.1) of Raw (0) or RLE (1) literals, in
// the 1, 2 or 3-byte form
const literalsHeader = (type: 0 | 1, size: number): Array<number> =>
  size < 32
    ? [(size << 3) | type]
    : size < 4096
    ? [((size & 15) << 4) | 0b0100 | type, size >>> 4]
    : [((size & 15) << 4) | 0b1100 | type, (size >>> 4) & 0xff, size >>> 12]
const rawLiterals = (data: Bytes): Uint8Array => concat(literalsHeader(0, data.length), data)
const rleLiterals = (byte: number, size: number): Array<number> => [...literalsHeader(1, size), byte]
// Compressed (2) or Treeless (3) literals: the smallest Size_Format for the
// number of streams and sizes
const huffmanLiterals = (type: 2 | 3, streams: 1 | 4, size: number, content: Bytes): Uint8Array => {
  const max = Math.max(size, content.length)
  const sizeFormat = streams === 1 ? 0 : max < 1024 ? 1 : max < 16384 ? 2 : 3
  const bits = [10, 10, 14, 18][sizeFormat]
  const header = le(
    type + sizeFormat * 4 + size * 16 + content.length * 2 ** (4 + bits),
    sizeFormat < 2 ? 3 : sizeFormat + 2
  )
  return concat(header, content)
}
// Four Huffman streams behind a Jump_Table (§3.1.1.3.1.6)
const jumpTable = (...streams: ReadonlyArray<Bytes>): Uint8Array =>
  concat(le(streams[0].length, 2), le(streams[1].length, 2), le(streams[2].length, 2), ...streams)

// A backward bitstream (§3.1.1.3.2.1.2, §4.2.2) whose [value, width] fields
// are read in the given order: the first field sits just below the end mark
const backward = (...fields: ReadonlyArray<readonly [value: number, width: number]>): Array<number> => {
  let value = 1n
  let width = 0
  for (const [v, w] of fields) {
    value = (value << BigInt(w)) | BigInt(v)
    width += w
  }
  const out: Array<number> = []
  for (let i = 0; i <= width; i += 8) {
    out.push(Number(value & 0xffn))
    value >>= 8n
  }
  return out
}

// Huffman weights (§4.2.1) in direct representation for "a" (0x61), weight
// 1; "b" gets the implied last weight, 1. "a" decodes from bit 0, "b" from 1.
const WEIGHTS_AB = [127 + 98, ...new Array(48).fill(0), 0x01]
const abStream = (s: string): Array<number> => backward(...Array.from(s, (c) => [c === "b" ? 1 : 0, 1] as const))

// Sequences_Section_Header (§3.1.1.3.2.1)
const NO_SEQUENCES = [0]
const sequenceCount = (n: number): Array<number> =>
  n < 128 ? [n] : n < 0x7f00 ? [0x80 + (n >>> 8), n & 0xff] : [0xff, (n - 0x7f00) & 0xff, (n - 0x7f00) >>> 8]
const PREDEFINED = 0
const RLE = 1
const FSE = 2
const REPEAT = 3
const modes = (ll: number, of: number, ml: number): number => (ll << 6) | (of << 4) | (ml << 2)
// Sequences with RLE_Mode tables: every sequence has the same codes, and the
// bitstream holds only their extra bits, offset first. Literals_Length_Code n
// < 16 is a length of n; Match_Length_Code n < 32 is a length of n + 3;
// Offset_Code n is an Offset_Value of 2^n plus n extra bits.
const rleSequences = (count: number, ll: number, of: number, ml: number, stream: Bytes): Uint8Array =>
  concat(sequenceCount(count), [modes(RLE, RLE, RLE), ll, of, ml], stream)

// Output "abcdefgh" before the block under test, in a frame with a 1 KB window
const PREFIX = rawBlock(ascii("abcdefgh"), false)
const afterPrefix = (...blocks: ReadonlyArray<Bytes>): Uint8Array => frame(WINDOW_1KB, PREFIX, ...blocks)
// One sequence of `literals`, then a match of 4
const sequence = (literals: string, ofCode: number, stream: Bytes, last = true): Uint8Array =>
  compressedBlock(rawLiterals(ascii(literals)), rleSequences(1, literals.length, ofCode, 1, stream), last)

// FSE_Compressed_Mode offsets (§4.1.1): Accuracy_Log 5, Offset_Codes 0 and 1
// at probability 16 each. State 3 is the first cell of code 1 and moves to
// state 0 or 1, both code 0, with 1 bit. Literals_Length and Match_Length
// use RLE_Mode codes 1 (one literal, a match of 4).
// Output after PREFIX: "X", offset 8 (Offset_Value 3), "Y", offset 8 again
const fseBlock = (last: boolean): Uint8Array =>
  compressedBlock(
    rawLiterals(ascii("XY")),
    concat([2, modes(RLE, FSE, RLE), 1, 0x10, 0x3f, 1], backward([3, 5], [1, 1], [0, 1])),
    last
  )

// A block with one match of 4 at `offset` (Offset_Code 10, so offsets 1021
// to 2044)
const matchAt = (offset: number): Uint8Array =>
  compressedBlock(rawLiterals([]), rleSequences(1, 0, 10, 1, backward([offset + 3 - 1024, 10])))

// FSE_Compressed_Mode offsets with a single symbol: Accuracy_Log 5, Offset_Code
// 3 at probability 32. Every state is code 3 and moves with 0 bits. Output
// after PREFIX: "X", then a match of 4 at offset 8 (Offset_Value 8 + 3)
const singleSymbolFseBlock = compressedBlock(
  rawLiterals(ascii("X")),
  concat([1, modes(RLE, FSE, RLE), 1, 0x10, 0xfc, 0x01, 1], backward([0, 5], [3, 3]))
)

const options: Compression.DecompressOptions = { maxOutputSize: 1 << 20 }

const { decodes, fails } = assertions(Compression.decompressZstd, "Zstd", options)

// The first `n` bytes of `input` fail with Truncated, for every n in [from, to)
const failsTruncated = (input: Uint8Array, from: number, to: number): void => {
  for (let n = from; n < to; n++) fails(input.subarray(0, n), "Truncated")
}

// "hello " in a Raw_Block, "xxx" in an RLE_Block, with a Window_Descriptor,
// a 4-byte Frame_Content_Size and a Content_Checksum. Offsets: header 4-9,
// block headers 10-12 and 19-21, checksum 23-26.
const STRUCTURED = frame(
  [0x84, 0x00, ...le(9, 4)],
  rawBlock(ascii("hello "), false),
  rleBlock(0x78, 3),
  CHECKSUM_HELLO_XXX
)

export const suite = (): void => {
  describe("Zstd (RFC 8878)", () => {
    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1
    describe("Frames (§3.1)", () => {
      // RFC 8878 §3.1.1
      it("decodes a Zstandard frame", () => {
        decodes(HELLO_NO_CHECKSUM, "hello hello hello hello")
      })

      // RFC 8878 §3.1.1, §3.1.1.2: "Each frame must have at least 1 block"
      it("decodes a frame whose only block is empty as no bytes", () => {
        decodes(EMPTY, "")
      })

      // RFC 8878 §3.1
      it("decodes concatenated frames as the concatenation of their content", () => {
        decodes(CONCATENATED, "hello world")
        decodes(concat(STRUCTURED, HELLO, STRUCTURED), "hello xxxhello hello hello hellohello xxx")
      })

      // RFC 8878 §3.1.1: Magic_Number 0xFD2FB528
      it("MUST reject input that does not start with a frame's magic number", () => {
        fails(hex("28b52ffe240001000099e9d851"), "Malformed")
        fails(ascii("hello world"), "Malformed")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.2
    describe("Skippable frames (§3.1.2)", () => {
      // RFC 8878 §3.1.2: Magic_Number 0x184D2A5?
      it("skips a skippable frame with any of the 16 magic numbers", () => {
        for (let nibble = 0; nibble < 16; nibble++) {
          decodes(concat(skippable(nibble, ascii("xyz")), HELLO), "hello hello hello hello")
        }
      })

      // RFC 8878 §3.1.2: User_Data "will be skipped by decoders"
      it("does not interpret User_Data, even when it holds a frame", () => {
        decodes(concat(skippable(0, HELLO), HELLO_NO_CHECKSUM, skippable(15, [])), "hello hello hello hello")
      })

      // RFC 8878 §3.1.2
      it("decodes input of skippable frames only as no bytes", () => {
        decodes(skippable(0, []), "")
        decodes(concat(skippable(3, ascii("a")), skippable(7, ascii("bc"))), "")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.1
    describe("Frame_Header (§3.1.1.1)", () => {
      // RFC 8878 §3.1.1.1.1.4
      it("MUST reject a Frame_Header_Descriptor with the Reserved_Bit set", () => {
        fails(frame([0x28, 5], rawBlock(ascii("hello"))), "Malformed")
      })

      // RFC 8878 §3.1.1.1.1.3: "shall not interpret this bit"
      it("ignores the Unused_Bit", () => {
        decodes(frame([0x30, 5], rawBlock(ascii("hello"))), "hello")
      })

      // RFC 8878 §3.1.1.1.1.2: Window_Size is Frame_Content_Size
      it("reads no Window_Descriptor when Single_Segment_Flag is set", () => {
        decodes(frame(singleSegment(5), rawBlock(ascii("hello"))), "hello")
      })

      // RFC 8878 §3.1.1.1.2: Window_Size = 2^(10 + Exponent) * (1 + Mantissa / 8),
      // and §3.1.1.4: offsets must stay within Window_Size
      it("MUST reject a match offset beyond Window_Size from Exponent and Mantissa", () => {
        // Descriptor 0x01: 1 KB + 1/8 KB = 1152 bytes
        const data = randomBytes(1153, 1)
        decodes(
          frame(windowed(0x01), rawBlock(data.subarray(0, 1152), false), matchAt(1151)),
          concat(data.subarray(0, 1152), data.subarray(1, 5))
        )
        fails(
          frame(
            windowed(0x01),
            rawBlock(data.subarray(0, 1152), false),
            rawBlock(data.subarray(1152), false),
            matchAt(1153)
          ),
          "Malformed"
        )
      })

      // RFC 8878 §3.1.1.1.3, §1: an unsupported parameter must produce an error
      it("MUST fail with Unsupported for a frame that needs a dictionary", () => {
        fails(frame([0x21, 7, 5], rawBlock(ascii("hello"))), "Unsupported")
        fails(frame([0x22, 0x34, 0x12, 5], rawBlock(ascii("hello"))), "Unsupported")
        fails(frame([0x23, 0, 0, 0, 0x80, 5], rawBlock(ascii("hello"))), "Unsupported")
      })

      // RFC 8878 §3.1.1.1.4: FCS_Field_Size 1 when FCS_Flag is 0 and
      // Single_Segment_Flag is set
      it("reads a 1-byte Frame_Content_Size", () => {
        decodes(frame([0x20, 200], rleBlock(0x61, 200)), "a".repeat(200))
      })

      // RFC 8878 §3.1.1.1.4: "When FCS_Field_Size is 2, the offset of 256 is added"
      it("adds 256 to a 2-byte Frame_Content_Size", () => {
        decodes(frame([0x60, 44, 0], rleBlock(0x61, 300)), "a".repeat(300))
        decodes(frame([0x60, 0, 0], rleBlock(0x61, 256)), "a".repeat(256))
      })

      // RFC 8878 §3.1.1.1.4
      it("reads a 4-byte Frame_Content_Size", () => {
        decodes(frame([0xa0, ...le(70000, 4)], rleBlock(0x62, 70000)), "b".repeat(70000))
      })

      // RFC 8878 §3.1.1.1.4
      it("reads an 8-byte Frame_Content_Size", () => {
        decodes(frame([0xe0, ...le(5, 8)], rawBlock(ascii("hello"))), "hello")
      })

      // RFC 8878 §3.1.1.1.4: FCS_Field_Size 0 when FCS_Flag is 0 and
      // Single_Segment_Flag is not set
      it("decodes a frame without Frame_Content_Size", () => {
        decodes(frame(WINDOW_1KB, rawBlock(ascii("hello"))), "hello")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.2
    describe("Blocks (§3.1.1.2)", () => {
      // RFC 8878 §3.1.1.2.2: Raw_Block
      it("decodes a Raw_Block as its Block_Size bytes", () => {
        decodes(frame(WINDOW_1KB, rawBlock(ascii("hello"))), "hello")
      })

      // RFC 8878 §3.1.1.2.2: RLE_Block
      it("decodes an RLE_Block as its single byte repeated Block_Size times", () => {
        decodes(frame(WINDOW_1KB, rleBlock(0x7a, 1000)), "z".repeat(1000))
      })

      // RFC 8878 §3.1.1.2.1
      it("decodes blocks until the one with Last_Block set", () => {
        decodes(
          frame(
            WINDOW_1KB,
            rawBlock(ascii("ab"), false),
            rleBlock(0x63, 3, false),
            rawBlock([], false),
            rawBlock(ascii("d"))
          ),
          "abcccd"
        )
      })

      // RFC 8878 §3.1.1.2.2: "a compliant decoder must reject it"
      it("MUST reject the Reserved Block_Type", () => {
        fails(frame(WINDOW_1KB, blockHeader(3, 0, true)), "Malformed")
      })

      // RFC 8878 §3.1.1.2.4: Block_Maximum_Size is the smaller of Window_Size
      // and 128 KB
      it("MUST reject a Block_Size above Block_Maximum_Size", () => {
        decodes(frame(WINDOW_1KB, rleBlock(0x61, 1024)), "a".repeat(1024))
        fails(frame(WINDOW_1KB, rleBlock(0x61, 1025)), "Malformed")
        fails(frame(WINDOW_1KB, rawBlock(new Uint8Array(1025))), "Malformed")
        // 256 KB window
        decodes(frame(windowed(0x40), rleBlock(0x61, 131072)), "a".repeat(131072))
        fails(frame(windowed(0x40), rleBlock(0x61, 131073)), "Malformed")
      })

      // RFC 8878 §3.1.1.2.4: Block_Maximum_Size bounds the decompressed size
      it("MUST reject a Compressed_Block that decompresses to more than Block_Maximum_Size", () => {
        // 128 KB of literals and a match of 3 at repeat offset 4
        const block = compressedBlock(rleLiterals(0x61, 131072), rleSequences(1, 0, 0, 0, backward()))
        fails(frame(WINDOW_128KB, rawBlock(ascii("abcd"), false), block), "Malformed")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.3.1
    describe("Literals_Section (§3.1.1.3.1)", () => {
      // RFC 8878 §3.1.1.3.1.1, §3.1.1.3.1.2: Size_Format 00/10, 01 and 11
      it("decodes Raw_Literals_Block with 1, 2 and 3-byte headers", () => {
        for (const size of [0, 31, 32, 4095, 4096, 100000]) {
          const data = randomBytes(size, size)
          decodes(frame(WINDOW_128KB, compressedBlock(rawLiterals(data), NO_SEQUENCES)), data)
        }
      })

      // RFC 8878 §3.1.1.3.1.3
      it("decodes RLE_Literals_Block as its byte repeated Regenerated_Size times", () => {
        for (const size of [1, 31, 32, 4095, 4096, 100000]) {
          decodes(frame(WINDOW_128KB, compressedBlock(rleLiterals(0x7a, size), NO_SEQUENCES)), "z".repeat(size))
        }
      })

      // RFC 8878 §3.1.1.3.1.4, §4.2.2: Size_Format 00, one stream
      it("decodes a Compressed_Literals_Block with one Huffman stream", () => {
        const literals = huffmanLiterals(2, 1, 8, concat(WEIGHTS_AB, abStream("abbabaab")))
        decodes(frame(WINDOW_1KB, compressedBlock(literals, NO_SEQUENCES)), "abbabaab")
      })

      // RFC 8878 §3.1.1.3.1.6: streams 1 to 3 hold (Regenerated_Size + 3) / 4
      // literals, stream 4 the rest
      it("decodes four Huffman streams behind a Jump_Table", () => {
        const streams = jumpTable(abStream("abb"), abStream("baa"), abStream("abb"), abStream("a"))
        const literals = huffmanLiterals(2, 4, 10, concat(WEIGHTS_AB, streams))
        decodes(frame(WINDOW_1KB, compressedBlock(literals, NO_SEQUENCES)), "abbbaaabba")
      })

      // RFC 8878 §3.1.1.3.1.1: Size_Format 10 (14-bit sizes) and 11 (18-bit sizes)
      it("reads Regenerated_Size and Compressed_Size from 4 and 5-byte headers", () => {
        for (const size of [2000, 20000]) {
          const rand = lcg(size)
          const s = Array.from({ length: size }, () => (rand() & 1 ? "b" : "a")).join("")
          const segment = (size + 3) >>> 2
          const streams = jumpTable(
            abStream(s.slice(0, segment)),
            abStream(s.slice(segment, 2 * segment)),
            abStream(s.slice(2 * segment, 3 * segment)),
            abStream(s.slice(3 * segment))
          )
          decodes(
            frame(
              WINDOW_128KB,
              compressedBlock(huffmanLiterals(2, 4, size, concat(WEIGHTS_AB, streams)), NO_SEQUENCES)
            ),
            s
          )
        }
      })

      // RFC 8878 §3.1.1.3.1.4: Treeless_Literals_Block reuses the previous
      // Huffman tree
      it("decodes a Treeless_Literals_Block with the previous block's Huffman tree", () => {
        const first = compressedBlock(
          huffmanLiterals(2, 1, 8, concat(WEIGHTS_AB, abStream("abbabaab"))),
          NO_SEQUENCES,
          false
        )
        const treeless = compressedBlock(huffmanLiterals(3, 1, 4, abStream("baba")), NO_SEQUENCES, false)
        const treeless4 = compressedBlock(
          huffmanLiterals(3, 4, 7, jumpTable(abStream("bb"), abStream("aa"), abStream("ba"), abStream("b"))),
          NO_SEQUENCES
        )
        decodes(frame(WINDOW_1KB, first, treeless, treeless4), "abbabaabbababbaabab")
      })

      // RFC 8878 §3.1.1.3.1.4: "it should be treated as data corruption"
      it("MUST reject a Treeless_Literals_Block without a previous Huffman tree in the frame", () => {
        const tree = compressedBlock(huffmanLiterals(2, 1, 2, concat(WEIGHTS_AB, abStream("ab"))), NO_SEQUENCES)
        const treeless = compressedBlock(huffmanLiterals(3, 1, 2, abStream("ab")), NO_SEQUENCES)
        fails(frame(WINDOW_1KB, treeless), "Malformed")
        // The tree of an earlier frame does not carry over
        fails(concat(frame(WINDOW_1KB, tree), frame(WINDOW_1KB, treeless)), "Malformed")
      })

      // RFC 8878 §3.1.1.3.1.6: the last stream "may be up to 3 bytes smaller"
      it("MUST reject four streams whose last stream would have fewer than zero literals", () => {
        // 5 literals: streams of 2, 2, 2 and -1
        const streams = jumpTable(abStream("ab"), abStream("ab"), abStream("a"), abStream(""))
        fails(
          frame(WINDOW_1KB, compressedBlock(huffmanLiterals(2, 4, 5, concat(WEIGHTS_AB, streams)), NO_SEQUENCES)),
          "Malformed"
        )
      })

      // RFC 8878 §3.1.1.3.1.6: "if Stream1_Size + Stream2_Size + Stream3_Size
      // exceeds Total_Streams_Size, the data are considered corrupted"
      it("MUST reject a Jump_Table whose stream sizes exceed the literals section", () => {
        const streams = concat(le(1, 2), le(1, 2), le(9, 2), abStream("a"), abStream("a"), abStream("a"), abStream("a"))
        fails(
          frame(WINDOW_1KB, compressedBlock(huffmanLiterals(2, 4, 4, concat(WEIGHTS_AB, streams)), NO_SEQUENCES)),
          "Malformed"
        )
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-4.2
    describe("Huffman coding (§4.2)", () => {
      // Literals 2, 0, 1, 2 with weights 1, 1 and the implied 2: symbols 0
      // and 1 take 2-bit codes 00 and 01, symbol 2 the 1-bit code 1
      const LITERALS_2012 = backward([1, 1], [0, 2], [1, 2], [1, 1])
      const huffman = (weights: Bytes, stream: Bytes = LITERALS_2012) =>
        frame(WINDOW_1KB, compressedBlock(huffmanLiterals(2, 1, 4, concat(weights, stream)), NO_SEQUENCES))

      // RFC 8878 §4.2.1.1: headerByte >= 128, 4-bit weights
      it("decodes Huffman weights in direct representation", () => {
        decodes(huffman([127 + 2, 0x11]), [2, 0, 1, 2])
      })

      // RFC 8878 §4.2.1.2: headerByte < 128 is the size of an FSE-compressed
      // stream of weights decoded with two interleaved states
      it("decodes FSE-compressed Huffman weights", () => {
        // Accuracy_Log 5, weights 0 and 1 at probability 16 each; both
        // states start at 3, a cell of weight 1, and the stream overflows on
        // the first state update
        decodes(huffman([4, 0x10, 0x3f, ...backward([3, 5], [3, 5])]), [2, 0, 1, 2])
      })

      // RFC 8878 §4.1: each initial state consumes Accuracy_Log bits.
      // §4.2.1.2 assumes zero bits only when updating a state overflows the
      // stream, not when initializing State1 and State2.
      it("MUST reject FSE-compressed weights without the bits of both initial states", () => {
        // Accuracy_Log 5, weight 0 at probability -1 and weight 1 at 31:
        // state 0 is weight 1, so states read as zero would build a valid tree
        const description = [0x00, 0x7e]
        // Control: both initial states, 0, are in the stream
        decodes(huffman([4, ...description, ...backward([0, 5], [0, 5])]), [2, 0, 1, 2])
        // Only the end mark
        fails(huffman([3, ...description, 0x01]), "Malformed")
        // State1's 5 bits, but not State2's
        fails(huffman([3, ...description, ...backward([0, 5])]), "Malformed")
      })

      // RFC 8878 §4.2.1.1: the implied last weight completes the sum to a
      // power of two
      it("MUST reject weights whose sum cannot be completed to a power of two", () => {
        // 2 + 2 + 1 = 5 leaves 3
        fails(huffman([127 + 3, 0x22, 0x10]), "Malformed")
      })

      // RFC 8878 §4.2.1: "This specification limits the maximum code length
      // to 11 bits"
      it("MUST reject Huffman codes longer than 11 bits", () => {
        // A weight of 12 means Max_Number_of_Bits 12
        fails(huffman([127 + 1, 0xc0]), "Malformed")
      })

      // RFC 8878 §4.2.2: streams are read backward from the end mark and
      // consumed exactly, as in §3.1.1.3.2.1.2
      it("MUST reject a Huffman stream that is not consumed exactly", () => {
        fails(huffman([127 + 2, 0x11], backward([1, 1], [0, 2], [1, 2], [1, 1], [0, 1])), "Malformed")
        fails(huffman([127 + 2, 0x11], backward([1, 1], [0, 2], [1, 2])), "Malformed")
      })

      // RFC 8878 §4.2.2: "the last byte must not be zero"
      it("MUST reject a Huffman stream without an end mark", () => {
        fails(huffman([127 + 2, 0x11], [0x55, 0x00]), "Malformed")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.3.2
    describe("Sequences_Section (§3.1.1.3.2)", () => {
      // RFC 8878 §3.1.1.3.2.1: Number_of_Sequences 0 means the block is
      // only literals
      it("decodes a block with Number_of_Sequences 0 as its literals", () => {
        decodes(frame(WINDOW_1KB, compressedBlock(rawLiterals(ascii("hello")), NO_SEQUENCES)), "hello")
      })

      // RFC 8878 §3.1.1.3.2.1: byte0 < 128, < 255 and 255
      it("reads Number_of_Sequences in its 1, 2 and 3-byte forms", () => {
        // Each sequence is one literal and a match of 3 at repeat offset 1
        for (const count of [127, 300, 0x7f00 + 5]) {
          const data = randomBytes(count, count)
          const block = compressedBlock(rawLiterals(data), rleSequences(count, 1, 0, 0, backward()))
          decodes(frame(WINDOW_128KB, block), Uint8Array.from({ length: count * 4 }, (_, i) => data[i >>> 2]))
        }
      })

      // RFC 8878 §3.1.1.3.2.2: the default distributions of Predefined_Mode
      it("decodes sequences with Predefined_Mode tables", () => {
        // The reference frame's Symbol_Compression_Modes byte is 0
        assert.strictEqual(HELLO_NO_CHECKSUM[17], modes(PREDEFINED, PREDEFINED, PREDEFINED))
        decodes(HELLO_NO_CHECKSUM, "hello hello hello hello")
      })

      // RFC 8878 §3.1.1.3.2.1: RLE_Mode
      it("decodes sequences with RLE_Mode tables", () => {
        decodes(frame(WINDOW_1KB, sequence("abc", 2, backward([2, 2]))), "abcabca")
      })

      // RFC 8878 §3.1.1.3.2.1, §4.1: FSE_Compressed_Mode
      it("decodes sequences with an FSE_Compressed_Mode table", () => {
        decodes(afterPrefix(fseBlock(true)), "abcdefghXbcdeYghXb")
      })

      // RFC 8878 §3.1.1.3.2.1: Repeat_Mode reuses the previous tables,
      // including RLE_Mode ones
      it("decodes sequences with Repeat_Mode tables", () => {
        const repeat = compressedBlock(
          rawLiterals(ascii("Z")),
          concat([1, modes(REPEAT, REPEAT, REPEAT)], backward([0, 5]))
        )
        decodes(afterPrefix(fseBlock(false), repeat), "abcdefghXbcdeYghXbZdeYg")
      })

      // RFC 8878 §3.1.1.3.2.1: "this should be treated as corruption"
      it("MUST reject Repeat_Mode without a previous table in the frame", () => {
        const repeat = compressedBlock(rawLiterals(ascii("Z")), concat([1, modes(REPEAT, RLE, RLE), 0, 1], backward()))
        fails(afterPrefix(repeat), "Malformed")
        fails(concat(afterPrefix(fseBlock(true)), afterPrefix(repeat)), "Malformed")
      })

      // RFC 8878 §3.1.1.3.2.1: "The last field, Reserved, must be all zeroes"
      it("MUST reject Symbol_Compression_Modes with Reserved bits set", () => {
        for (const reserved of [1, 2, 3]) {
          const block = compressedBlock(
            rawLiterals(ascii("a")),
            concat([1, modes(RLE, RLE, RLE) | reserved, 1, 0, 1], backward())
          )
          fails(afterPrefix(block), "Malformed")
        }
      })

      // RFC 8878 §3.1.1.3.2.1.1: Literals_Length_Code is at most 35 and
      // Match_Length_Code at most 52
      it("MUST reject length codes outside Tables 16 and 17", () => {
        fails(afterPrefix(compressedBlock(rawLiterals(ascii("a")), rleSequences(1, 36, 0, 1, backward()))), "Malformed")
        fails(afterPrefix(compressedBlock(rawLiterals(ascii("a")), rleSequences(1, 1, 0, 53, backward()))), "Malformed")
      })

      // RFC 8878 §3.1.1.3.2.1: maximum Accuracy_Log 9 for literals and match
      // lengths, 8 for offsets; §4.2.1.2: 6 for Huffman weights
      it("MUST reject an FSE table description above the maximum Accuracy_Log", () => {
        const sequences = (header: Bytes) => afterPrefix(compressedBlock(rawLiterals(ascii("a")), concat([1], header)))
        fails(sequences([modes(FSE, RLE, RLE), 0x05]), "Malformed")
        fails(sequences([modes(RLE, FSE, RLE), 1, 0x04]), "Malformed")
        fails(sequences([modes(RLE, RLE, FSE), 1, 0, 0x05]), "Malformed")
        const weights = huffmanLiterals(2, 1, 1, [3, 0x02, 0x00, 0x01])
        fails(frame(WINDOW_1KB, compressedBlock(weights, NO_SEQUENCES)), "Malformed")
      })

      // RFC 8878 §3.1.1.3.2.1.2: "the bitstream shall be entirely consumed;
      // otherwise, the bitstream is considered corrupted"
      it("MUST reject a sequences bitstream that is not consumed exactly", () => {
        decodes(afterPrefix(sequence("X", 0, backward())), "abcdefghXXXXX")
        fails(afterPrefix(sequence("X", 0, backward([0, 1]))), "Malformed")
        // Offset_Code 2 needs 2 extra bits
        fails(afterPrefix(sequence("X", 2, backward([1, 1]))), "Malformed")
      })

      // RFC 8878 §3.1.1.3.2.1.2: the last byte holds the end mark, so it
      // cannot be zero
      it("MUST reject a sequences bitstream without an end mark", () => {
        fails(afterPrefix(sequence("X", 0, [0x01, 0x00])), "Malformed")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.4
    describe("Sequence execution (§3.1.1.4)", () => {
      // RFC 8878 §3.1.1.4: literals first, then a match of Match_Length bytes
      // Offset bytes back; Offset_Value - 3 is a new offset (§3.1.1.5)
      it("copies the literals, then the match, repeating bytes when the offset is below the match length", () => {
        // "ab", then a match of 7 at offset 2 (Offset_Value 5)
        decodes(
          frame(WINDOW_1KB, compressedBlock(rawLiterals(ascii("ab")), rleSequences(1, 2, 2, 4, backward([1, 2])))),
          "ababababa"
        )
      })

      // RFC 8878 §3.1.1.3.2.1.1: Tables 16 and 17 baselines plus extra bits,
      // read after the offset's in the order match length, literals length
      it("decodes lengths from their code's baseline and extra bits", () => {
        // Literals_Length_Code 16 (16 + 1 bit), Match_Length_Code 32 (35 + 1 bit)
        const literals = ascii("abcdefghijklmnopq")
        decodes(
          frame(
            WINDOW_1KB,
            compressedBlock(rawLiterals(literals), rleSequences(1, 16, 0, 32, backward([1, 1], [1, 1])))
          ),
          concat(literals, new Uint8Array(36).fill(0x71))
        )
      })

      // RFC 8878 §3.1.1.4: literals left after the last sequence end the block
      it("appends the literals left after the last sequence", () => {
        decodes(
          frame(WINDOW_1KB, compressedBlock(rawLiterals(ascii("abcde")), rleSequences(1, 2, 0, 1, backward()))),
          "abbbbbcde"
        )
      })

      // RFC 8878 §3.1.1.4: Offset_Code above 25 adds more than 25 extra bits
      it("decodes offsets of 2^26 bytes and more", () => {
        const start = ascii("ABCDEFGHIJKLMNOP")
        const zeros = Array.from({ length: 512 }, () => rleBlock(0, 131072, false))
        // Offset 2^26 + 16 is Offset_Value 2^26 + 19; window 2^27
        const match = compressedBlock(rawLiterals([]), rleSequences(1, 0, 26, 13, backward([19, 26])))
        const result = Compression.decompressZstd(frame(windowed(0x88), rawBlock(start, false), ...zeros, match), {
          maxOutputSize: 2 ** 26 + 32
        })
        if (Result.isFailure(result)) return assert.fail(result.failure.message)
        assert.strictEqual(result.success.length, 2 ** 26 + 32)
        assert.deepStrictEqual(result.success.subarray(2 ** 26 + 16), start)
      })

      // RFC 8878 §3.1.1.4: Literals_Length within the decoded literals
      it("MUST reject a sequence that uses more literals than the block decoded", () => {
        fails(
          frame(WINDOW_1KB, compressedBlock(rawLiterals(ascii("a")), rleSequences(1, 2, 0, 1, backward()))),
          "Malformed"
        )
      })

      // RFC 8878 §3.1.1.4: offsets lead to previously decoded data
      it("MUST reject a match offset beyond the decoded output", () => {
        // Offset 3 after 2 bytes
        fails(
          frame(WINDOW_1KB, compressedBlock(rawLiterals(ascii("ab")), rleSequences(1, 2, 2, 1, backward([2, 2])))),
          "Malformed"
        )
      })

      // RFC 8878 §3.1.1: frames are independent
      it("MUST reject a match offset that reaches into a previous frame", () => {
        const frame2 = frame(WINDOW_1KB, sequence("X", 3, backward([0, 3])))
        decodes(afterPrefix(sequence("X", 3, backward([0, 3]))), "abcdefghXefgh")
        fails(concat(afterPrefix(rawBlock([])), frame2), "Malformed")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.5
    describe("Repeat offsets (§3.1.1.5)", () => {
      // RFC 8878 §3.1.1.5: initial values 1, 4 and 8
      it("uses Repeated_Offset1, 2 and 3 for Offset_Value 1, 2 and 3 when Literals_Length is not 0", () => {
        decodes(afterPrefix(sequence("X", 0, backward())), "abcdefghXXXXX")
        decodes(afterPrefix(sequence("X", 1, backward([0, 1]))), "abcdefghXfghX")
        decodes(afterPrefix(sequence("X", 1, backward([1, 1]))), "abcdefghXbcde")
      })

      // RFC 8878 §3.1.1.5: with Literals_Length 0 the values shift by one
      it("uses Repeated_Offset2, 3 and Repeated_Offset1 - 1 for Offset_Value 1, 2 and 3 when Literals_Length is 0", () => {
        decodes(afterPrefix(sequence("", 0, backward())), "abcdefghefgh")
        decodes(afterPrefix(sequence("", 1, backward([0, 1]))), "abcdefghabcd")
        // A new offset of 5 first, so Repeated_Offset1 - 1 is 4
        decodes(
          afterPrefix(sequence("X", 3, backward([0, 3]), false), sequence("", 1, backward([1, 1]))),
          "abcdefghXefghefgh"
        )
      })

      // RFC 8878 §3.1.1.5: Repeated_Offset1 - 1 with Repeated_Offset1 1 is
      // an offset of 0
      it("MUST reject a repeat offset of 0", () => {
        fails(afterPrefix(sequence("", 1, backward([1, 1]))), "Malformed")
      })

      // RFC 8878 §3.1.1.5: a used repeat offset moves to the front, and the
      // history carries over to the next block
      it("moves the used offset to the front of the history", () => {
        // Literals_Length 0, Offset_Value 1 uses Repeated_Offset2 (4), which
        // the next block's Offset_Value 1 then finds first
        decodes(afterPrefix(sequence("", 0, backward(), false), sequence("X", 0, backward())), "abcdefghefghXfghX")
      })

      // RFC 8878 §3.1.1.5: the history starts at 1, 4, 8 in every frame
      it("resets the history at each frame", () => {
        const first = afterPrefix(sequence("X", 3, backward([0, 3])))
        decodes(concat(first, afterPrefix(sequence("X", 0, backward()))), "abcdefghXefghabcdefghXXXXX")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1
    describe("Content_Checksum (§3.1.1)", () => {
      // RFC 8878 §3.1.1: the low 4 bytes of XXH64 of the frame's content
      it("decodes a frame with a matching Content_Checksum", () => {
        decodes(HELLO, "hello hello hello hello")
        decodes(STRUCTURED, "hello xxx")
      })

      // RFC 8878 §3.1.1, local policy: the checksum is always verified
      it("rejects a frame whose Content_Checksum does not match", () => {
        const badChecksum = HELLO.slice()
        badChecksum[badChecksum.length - 1] ^= 1
        fails(badChecksum, "Checksum")
        const badData = STRUCTURED.slice()
        badData[13] ^= 1
        fails(badData, "Checksum")
      })
    })

    // RFC 8878 §3.1.1, §3.1.2: input that ends inside a structure
    describe("Truncated input", () => {
      // RFC 8878 §3.1.1: Magic_Number is 4 bytes; empty input is local policy
      it("MUST reject input that ends inside the magic number", () => {
        failsTruncated(HELLO, 0, 4)
      })

      // RFC 8878 §3.1.1.1
      it("MUST reject input that ends inside the Frame_Header", () => {
        failsTruncated(STRUCTURED, 4, 10)
        fails(frame([0x23, 0, 0]), "Truncated")
      })

      // RFC 8878 §3.1.1.2: Block_Header is 3 bytes
      it("MUST reject input that ends inside a Block_Header", () => {
        failsTruncated(STRUCTURED, 10, 13)
        failsTruncated(STRUCTURED, 20, 22)
      })

      // RFC 8878 §3.1.1.2: "Each frame must have at least 1 block"; the
      // frame ends with the block that has Last_Block set
      it("MUST reject a frame that ends before its last block", () => {
        fails(STRUCTURED.subarray(0, 19), "Truncated")
        fails(frame(WINDOW_1KB), "Truncated")
      })

      // RFC 8878 §3.1.1.2.3
      it("MUST reject input that ends inside a block's Block_Content", () => {
        failsTruncated(STRUCTURED, 13, 19)
        fails(STRUCTURED.subarray(0, 22), "Truncated")
        failsTruncated(HELLO_NO_CHECKSUM, 9, HELLO_NO_CHECKSUM.length)
      })

      // RFC 8878 §3.1.1: Content_Checksum is 4 bytes
      it("MUST reject input that ends inside the Content_Checksum", () => {
        failsTruncated(STRUCTURED, 23, 27)
      })

      // RFC 8878 §3.1.2: Frame_Size then Frame_Size bytes of User_Data
      it("MUST reject input that ends inside a skippable frame", () => {
        const input = skippable(5, ascii("xyz"))
        failsTruncated(input, 4, input.length)
      })
    })

    // Local policy: RFC 8878 §8 asks decoders to bound memory use
    describe("Resource limits (local policy)", () => {
      // https://www.rfc-editor.org/rfc/rfc8878#section-8
      it("fails with OutputLimit when the output would exceed maxOutputSize", () => {
        decodes(frame(WINDOW_128KB, rleBlock(0x61, 100000)), "a".repeat(100000), { maxOutputSize: 100000 })
        fails(frame(WINDOW_128KB, rleBlock(0x61, 100000)), "OutputLimit", { maxOutputSize: 99999 })
        fails(concat(HELLO, HELLO), "OutputLimit", { maxOutputSize: 40 })
      })

      // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.1.4
      it("fails with OutputLimit before decoding a frame whose Frame_Content_Size exceeds maxOutputSize", () => {
        // No blocks follow, so decoding anything would fail with Truncated
        fails(frame([0xe0, ...le(2 ** 40, 8)]), "OutputLimit")
        fails(frame([0xe0, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), "OutputLimit")
        fails(frame([0xa0, ...le(101, 4)]), "OutputLimit", { maxOutputSize: 100 })
        // Counting the earlier frames' output
        fails(concat(STRUCTURED, frame([0xa0, ...le(92, 4)])), "OutputLimit", { maxOutputSize: 100 })
      })
    })

    // Inputs the RFC's wording excludes, accepted to match libzstd 1.5.7.
    // These tests pin deliberate deviations; they are not RFC 8878 conformance.
    describe("Compatibility exceptions (not RFC 8878 conformance)", () => {
      // RFC 8878 §3.1.1.4: offsets "must be smaller than Window_Size".
      // libzstd's encoder emits offsets equal to Window_Size (level 19 with a
      // 1 KB window matches 1024 bytes back), so rejecting them would reject
      // its output.
      it("accepts a match offset equal to Window_Size", () => {
        const data = randomBytes(1152, 1)
        decodes(
          frame(windowed(0x01), rawBlock(data, false), matchAt(1152)),
          concat(data, data.subarray(0, 4))
        )
      })

      // RFC 8878 §4.1.1: "there must be two or more symbols with nonzero
      // probability", and §3.1.1.3.2.1: FSE_Compressed_Mode "must not be used
      // when only one symbol is present ... (although any other mode will
      // work)". Such a table decodes unambiguously, as in libzstd.
      it("accepts an FSE_Compressed_Mode table with a single symbol", () => {
        decodes(afterPrefix(singleSymbolFseBlock), "abcdefghXbcde")
      })
    })

    // Local policy for what the RFC leaves to the decoder
    describe("Decoder policy", () => {
      // https://www.rfc-editor.org/rfc/rfc8878#section-3.1
      it("rejects bytes after the last frame that do not form a frame", () => {
        fails(concat(HELLO, [0]), "Malformed")
        fails(concat(HELLO, MAGIC.slice(0, 3)), "Malformed")
        fails(concat(HELLO, new Uint8Array(16)), "Malformed")
        decodes(concat(HELLO, skippable(0, [])), "hello hello hello hello")
      })

      // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.1.4
      it("rejects a frame whose output differs from its Frame_Content_Size", () => {
        fails(frame([0x80, 0x00, ...le(6, 4)], rawBlock(ascii("hello"))), "Malformed")
        fails(frame([0x80, 0x00, ...le(4, 4)], rawBlock(ascii("hello"))), "Malformed")
      })

      // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.1.3
      it("decodes a frame whose Dictionary_ID field is 0 as one without a dictionary", () => {
        decodes(frame([0x21, 0, 5], rawBlock(ascii("hello"))), "hello")
        decodes(frame([0x23, 0, 0, 0, 0, 5], rawBlock(ascii("hello"))), "hello")
      })

      // https://www.rfc-editor.org/rfc/rfc8878#section-3.1.1.2.2
      it("returns output that does not share memory with the input", () => {
        const input = frame(singleSegment(5), rawBlock(ascii("hello")))
        const result = Compression.decompressZstd(input, options)
        if (Result.isFailure(result)) return assert.fail(result.failure.message)
        assert.notStrictEqual(result.success.buffer, input.buffer)
      })
    })

    // Interoperability with the reference encoder (libzstd 1.5.7 via
    // python-zstandard 0.25.0); see generate.py
    describe("Reference encoder output (interoperability)", () => {
      const TEXT = text(20000, 1)
      const alphabet = Uint8Array.from({ length: 32 }, (_, i) => 0x40 + i)
      const repeated = randomBytes(4096, 4)
      const fixtures: ReadonlyArray<readonly [name: string, expected: () => Uint8Array]> = [
        ["text-level1.zst", () => TEXT],
        ["text-level3.zst", () => TEXT],
        ["text-level19.zst", () => TEXT],
        ["text-level22.zst", () => TEXT],
        ["text-streamed.zst", () => TEXT],
        ["random.zst", () => randomBytes(3000, 2)],
        ["runs.zst", () => concat(new Uint8Array(300000).fill(0x61), new Uint8Array(1000).fill(0x62))],
        ["edits-level3.zst", () => edited(text(4096, 3), 34, 512, 9)],
        ["edits-level19.zst", () => edited(text(4096, 3), 34, 128, 9)],
        ["letters.zst", () => concat(letters(2000, alphabet, 6), letters(17000, alphabet, 7))],
        ["long-window.zst", () => concat(repeated, new Uint8Array(1 << 20), repeated)]
      ]
      for (const [name, expected] of fixtures) {
        // RFC 8878 §3.1.1: each fixture's features are listed in generate.py
        it(`decodes ${name}`, () => {
          decodes(fixture(`zstd/${name}`), expected(), { maxOutputSize: 1 << 21 })
        })
      }
    })
  })
}
