/**
 * Conformance of `Compression.decompressLz4Block` and
 * `Compression.decompressLz4Frame` to the LZ4 block and frame formats.
 *
 * Specifications, at tag v1.10.0:
 * - LZ4 Block Format Description, last revised 2022-07-31
 *   (https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Block_format.md)
 * - LZ4 Frame Format Description, version 1.6.4
 *   (https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Frame_format.md)
 * Field names in test titles (FLG, BD, HC, EndMark) are the spec's.
 *
 * The fixtures and the hand-crafted frame headers (with their header
 * checksums) come from `test/fixtures/compression/lz4/generate.py`
 * (python-lz4 4.4.4 bundling liblz4 1.9.4, xxhash 3.5.0). They are
 * interoperability evidence, not a replacement for the assertion tests;
 * malformed input and features the reference encoder does not emit (empty
 * blocks, skippable frames, rule-breaking block ends) are hand-crafted.
 *
 * Not covered:
 * - Frame "Dictionary ID": dictionaries are not supported, so a frame that
 *   sets the flag fails with `Unsupported` and dictionary decoding is untested.
 * - "Legacy frame": not supported, fails with `Unsupported`; its block layout
 *   is untested.
 * - Block "Large lengths" implementation notes: lengths are JavaScript
 *   numbers and bounded by the input size, so the register overflows they
 *   describe cannot happen.
 * - Frame "Block Independence flag" 64 KB window: implied by the 16-bit
 *   offset, so it needs no separate check.
 * - Frame "Content Size" above 2^53: not exactly representable, but always
 *   above any `maxOutputSize`, so covered by the `OutputLimit` test.
 * - Encoder guidance ("discouraged to start a flow of concatenated frames
 *   with a skippable frame", block size choice): applies to compressors.
 * - Decoder policy, not spec requirements: checksums are always verified (the
 *   spec lets a decoder ignore them), a frame whose data differs from its
 *   Content Size fails with `Malformed` (the spec lets a decoder skip the
 *   field), bytes after the last frame that do not start a frame fail with
 *   `Malformed`, empty input fails with `Truncated`, and blocks that break
 *   the end-of-block rules 2 and 3 are accepted (the spec allows, but does not
 *   require, rejecting them).
 */
import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Compression from "effect/encoding/Compression"
import { ascii, assertions, concat, fixture, hex, le, mixed, xorshift } from "./CompressionConformance.ts"

// Frame headers (magic number and frame descriptor) from generate.py
const HEADER = {
  independent: "04224d18604082",
  linked: "04224d184040c0",
  blockChecksum: "04224d187040ad",
  contentChecksum: "04224d186440a7",
  contentSize5: "04224d186840050000000000000061",
  contentSize2e40: "04224d1868400000000000010000b7",
  dictId: "04224d18614078563412e8",
  blockMax256KB: "04224d186050fb",
  blockMax1MB: "04224d18606051",
  blockMax4MB: "04224d18607073",
  version0: "04224d18204003",
  version2: "04224d18a0400f",
  flgReserved: "04224d186240f0",
  bdReservedHigh: "04224d1860c02a",
  bdReservedLow: "04224d186041bd",
  blockMaxId3: "04224d186030d4"
}
// xxh32 of "hello" and of no bytes, little-endian
const XXH32_HELLO = hex("f97700fb")
const XXH32_EMPTY = hex("055dcc02")

const u32 = (n: number): Array<number> => le(n, 4)
const END_MARK = u32(0)
const uncompressed = (data: Uint8Array): Uint8Array => concat(u32((data.length | 0x80000000) >>> 0), data)
const compressed = (block: ArrayLike<number>): Uint8Array => concat(u32(block.length), block)
const frame = (header: string, ...blocks: ReadonlyArray<ArrayLike<number>>): Uint8Array =>
  concat(hex(header), ...blocks, END_MARK)
const skippable = (nibble: number, data: Uint8Array): Uint8Array =>
  concat(u32(0x184d2a50 + nibble), u32(data.length), data)
const hello = (header: string): Uint8Array => frame(header, uncompressed(ascii("hello")))

const block = assertions(Compression.decompressLz4Block, "Lz4Block")
const frames = assertions(Compression.decompressLz4Frame, "Lz4Frame")

const A = 0x61
// "a", then a match at offset 1 of 19 plus the extension bytes
const run = (...extensions: Array<number>): Array<number> => [0x1f, A, 0x01, 0x00, ...extensions, 0x00]

export const suite = (): void => {
  describe("Lz4 (LZ4 block and frame formats, lz4 v1.10.0)", () => {
    // https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Block_format.md#compressed-block-format
    describe("Block: compressed block format", () => {
      it("decodes a sequence as its literals, then a match of minmatch 4 or more at a 2-byte little-endian offset", () => {
        // 4 literals and a match of 4 at offset 4, then 1 literal and a match of 4 + 14 at offset 9
        block.decodes(
          [0x40, ...ascii("abcd"), 0x04, 0x00, 0x1e, ...ascii("e"), 0x09, 0x00, 0x10, ...ascii("f")],
          ascii("abcdabcde" + "abcdabcdeabcdabcde".slice(0, 18) + "f")
        )
      })

      it("decodes literal lengths of 15 or more from the extension bytes", () => {
        // The spec's examples: 15 = 15 + 0, 48 = 15 + 33, 280 = 15 + 255 + 10
        for (const [length, extensions] of [[15, [0]], [48, [33]], [280, [255, 10]]] as const) {
          const data = xorshift(length, length)
          block.decodes([0xf0, ...extensions, ...data], data)
        }
      })

      it("decodes match lengths of 19 or more from the extension bytes", () => {
        block.decodes(run(0), new Uint8Array(1 + 19).fill(A))
        block.decodes(run(255, 10), new Uint8Array(1 + 19 + 255 + 10).fill(A))
      })

      it("decodes a match longer than its offset by repeating the bytes it produces", () => {
        // Offset 3, lengths 10 and 100
        block.decodes([0x36, ...ascii("xyz"), 0x03, 0x00, 0x00], ascii("xyz".repeat(5).slice(0, 13)))
        block.decodes([0x3f, ...ascii("xyz"), 0x03, 0x00, 81, 0x00], ascii("xyz".repeat(35).slice(0, 103)))
      })

      it("decodes a single zero token as an empty block", () => {
        block.decodes([0x00], new Uint8Array(0))
      })

      it("MUST reject a match with offset 0", () => {
        block.fails([0x40, ...ascii("abcd"), 0x00, 0x00, 0x00], "Malformed")
      })

      it("MUST reject a match that reaches before the start of the output", () => {
        block.fails([0x40, ...ascii("abcd"), 0x05, 0x00, 0x00], "Malformed")
      })

      it("MUST reject input that ends inside a sequence", () => {
        // No token
        block.fails([], "Truncated")
        // Literal length extension, literals, offset, match length extension
        block.fails([0xf0], "Truncated")
        block.fails([0xf0, 0xff], "Truncated")
        block.fails([0x50, ...ascii("abcd")], "Truncated")
        block.fails([0x40, ...ascii("abcd"), 0x04], "Truncated")
        block.fails([0x4f, ...ascii("abcd"), 0x04, 0x00], "Truncated")
        block.fails([0x4f, ...ascii("abcd"), 0x04, 0x00, 0xff], "Truncated")
      })
    })

    // https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Block_format.md#end-of-block-conditions
    describe("Block: end of block conditions", () => {
      it("rejects a block that ends after a match, without a last sequence of literals only (rule 1)", () => {
        block.fails([0x40, ...ascii("abcd"), 0x04, 0x00], "Truncated")
      })

      it("accepts a block whose last 5 bytes are not literals and whose last match ends it (rules 2 and 3)", () => {
        // The spec allows, but does not require, rejecting such blocks
        block.decodes([0x40, ...ascii("abcd"), 0x04, 0x00, 0x00], ascii("abcdabcd"))
      })
    })

    describe("Block: interoperability (python-lz4 4.4.4, liblz4 1.9.4)", () => {
      it("decodes a block compressed by the reference encoder", () => {
        block.decodes(fixture("lz4/block.lz4"), mixed())
      })
    })

    describe("Block: resource limits (local policy)", () => {
      it("fails with OutputLimit when the block expands past maxOutputSize", () => {
        block.fails(run(255, 10), "OutputLimit", { maxOutputSize: 284 })
        block.decodes(run(255, 10), new Uint8Array(285).fill(A), { maxOutputSize: 285 })
      })

      it("fails with SizeMismatch when the output differs from expectedSize", () => {
        block.fails(run(255, 10), "SizeMismatch", { maxOutputSize: 1024, expectedSize: 284 })
        block.fails(run(255, 10), "SizeMismatch", { maxOutputSize: 1024, expectedSize: 286 })
      })
    })

    // https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Frame_format.md#general-structure-of-lz4-frame-format
    describe("Frame: general structure", () => {
      it("decodes a frame with no data blocks as empty output", () => {
        frames.decodes(hex("04224d1860408200000000"), new Uint8Array(0))
      })

      it("MUST reject a frame whose magic number is not 0x184D2204", () => {
        frames.fails(hex("05224d1860408200000000"), "Malformed")
      })

      it("MUST reject input that ends before the EndMark", () => {
        frames.fails(hex(HEADER.independent), "Truncated")
        frames.fails(concat(hex(HEADER.independent), uncompressed(ascii("hello")), [0, 0]), "Truncated")
      })

      // "Frame Concatenation"
      it("decodes concatenated frames in order", () => {
        frames.decodes(concat(hello(HEADER.independent), hello(HEADER.linked)), ascii("hellohello"))
      })

      it("MUST NOT let a match reach into a previous frame, since each frame is independent", () => {
        const second = frame(HEADER.linked, compressed([0x04, 0x05, 0x00, 0x00]))
        frames.fails(concat(hello(HEADER.linked), second), "Malformed")
      })
    })

    // https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Frame_format.md#frame-descriptor
    describe("Frame: frame descriptor", () => {
      it("MUST reject input that ends inside the magic number or frame descriptor", () => {
        frames.fails(new Uint8Array(0), "Truncated")
        for (const length of [3, 4, 5, 6]) frames.fails(hex(HEADER.independent).subarray(0, length), "Truncated")
        // Inside the optional Content Size field
        frames.fails(hex(HEADER.contentSize5).subarray(0, 10), "Truncated")
      })

      // "Version Number"
      it("MUST reject a version other than 01", () => {
        frames.fails(frame(HEADER.version0), "Malformed")
        frames.fails(frame(HEADER.version2), "Malformed")
      })

      // "Reserved bits"
      it("MUST reject a frame descriptor with a reserved FLG or BD bit set", () => {
        frames.fails(frame(HEADER.flgReserved), "Malformed")
        frames.fails(frame(HEADER.bdReservedHigh), "Malformed")
        frames.fails(frame(HEADER.bdReservedLow), "Malformed")
      })

      // "Block Maximum Size"
      it("decodes block maximum size ids 4 to 7 (64 KB, 256 KB, 1 MB, 4 MB)", () => {
        for (const header of [HEADER.independent, HEADER.blockMax256KB, HEADER.blockMax1MB, HEADER.blockMax4MB]) {
          frames.decodes(hello(header), ascii("hello"))
        }
      })

      it("MUST reject block maximum size ids the spec does not define", () => {
        frames.fails(frame(HEADER.blockMaxId3), "Malformed")
      })

      // "Header Checksum"
      it("MUST reject a frame whose HC is not the second byte of the xxh32 of the descriptor", () => {
        const header = hex(HEADER.independent)
        header[6] ^= 1
        frames.fails(concat(header, END_MARK), "Checksum")
        // HC covers the optional fields
        const sized = hex(HEADER.contentSize5)
        sized[6] = 6
        frames.fails(concat(sized, uncompressed(ascii("hello!")), END_MARK), "Checksum")
      })

      // "Dictionary ID"
      it("fails with Unsupported for a frame with a Dict-ID, since dictionaries are not supported", () => {
        frames.fails(hello(HEADER.dictId), "Unsupported")
      })

      // "Content Size"
      it("decodes a frame whose data matches its Content Size", () => {
        frames.decodes(hello(HEADER.contentSize5), ascii("hello"))
      })

      it("rejects a frame whose data differs from its Content Size", () => {
        frames.fails(frame(HEADER.contentSize5, uncompressed(ascii("hell"))), "Malformed")
        frames.fails(frame(HEADER.contentSize5, uncompressed(ascii("hello!"))), "Malformed")
      })

      // "Block Independence flag"
      it("decodes linked blocks whose matches reach into earlier blocks of the frame", () => {
        // 0 literals, a match of 8 at offset 8, then an empty last sequence
        const match = compressed([0x04, 0x08, 0x00, 0x00])
        frames.decodes(frame(HEADER.linked, uncompressed(ascii("abcdefgh")), match), ascii("abcdefghabcdefgh"))
      })

      it("MUST reject, with independent blocks, a match that reaches into an earlier block", () => {
        const match = compressed([0x04, 0x08, 0x00, 0x00])
        frames.fails(frame(HEADER.independent, uncompressed(ascii("abcdefgh")), match), "Malformed")
      })

      // "Block checksum flag", "Block checksum"
      it("verifies each Block Checksum, the xxh32 of the raw block data", () => {
        const empty = concat(u32(0x80000000), XXH32_EMPTY)
        const block = concat(uncompressed(ascii("hello")), XXH32_HELLO)
        frames.decodes(frame(HEADER.blockChecksum, empty, block), ascii("hello"))
        const bad = block.slice()
        bad[9] ^= 1
        frames.fails(frame(HEADER.blockChecksum, bad), "Checksum")
        frames.fails(
          concat(hex(HEADER.blockChecksum), uncompressed(ascii("hello")), XXH32_HELLO.subarray(0, 2)),
          "Truncated"
        )
      })

      // "Content checksum flag", "Content Checksum"
      it("verifies the Content Checksum, the xxh32 of the decoded data, after the EndMark", () => {
        frames.decodes(concat(hello(HEADER.contentChecksum), XXH32_HELLO), ascii("hello"))
        frames.fails(concat(hello(HEADER.contentChecksum), XXH32_EMPTY), "Checksum")
        frames.fails(concat(hello(HEADER.contentChecksum), XXH32_HELLO.subarray(0, 3)), "Truncated")
      })
    })

    // https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Frame_format.md#data-blocks
    describe("Frame: data blocks", () => {
      it("decodes a block whose Block Size has the highest bit set as uncompressed data", () => {
        frames.decodes(hello(HEADER.independent), ascii("hello"))
      })

      it("decodes an LZ4-compressed block", () => {
        frames.decodes(frame(HEADER.independent, compressed([0x50, ...ascii("hello")])), ascii("hello"))
      })

      it("decodes an empty uncompressed block (0x80000000) without ending the frame", () => {
        frames.decodes(frame(HEADER.independent, u32(0x80000000), uncompressed(ascii("hello"))), ascii("hello"))
      })

      it("MUST reject a Block Size larger than the Block Maximum Size", () => {
        frames.fails(frame(HEADER.independent, u32(0x10001)), "Malformed")
        frames.fails(frame(HEADER.independent, u32(0x80010001)), "Malformed")
      })

      it("MUST reject a block that decodes to more than the Block Maximum Size", () => {
        // 1 + 19 + 255 * 256 + n bytes against a maximum of 65536
        const extensions = new Array<number>(256).fill(255)
        frames.decodes(frame(HEADER.independent, compressed(run(...extensions, 236))), new Uint8Array(65536).fill(A))
        frames.fails(frame(HEADER.independent, compressed(run(...extensions, 237))), "Malformed")
      })

      it("MUST reject input that ends inside a block", () => {
        frames.fails(concat(hex(HEADER.independent), uncompressed(ascii("hello")).subarray(0, 7)), "Truncated")
      })
    })

    // https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Frame_format.md#skippable-frames
    describe("Frame: skippable frames", () => {
      it("skips skippable frames with magic numbers 0x184D2A50 to 0x184D2A5F", () => {
        for (let nibble = 0; nibble < 16; nibble++) {
          const input = concat(
            hex("04224d1860408200000000"),
            skippable(nibble, ascii("user data")),
            hello(HEADER.independent),
            skippable(nibble, new Uint8Array(0))
          )
          frames.decodes(input, ascii("hello"))
        }
      })

      it("MUST reject input that ends inside a skippable frame", () => {
        frames.fails(skippable(0, ascii("user data")).subarray(0, 6), "Truncated")
        frames.fails(skippable(0, ascii("user data")).subarray(0, 12), "Truncated")
      })
    })

    // https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Frame_format.md#legacy-frame
    describe("Frame: legacy frame", () => {
      it("fails with Unsupported for the legacy frame format (magic 0x184C2102)", () => {
        frames.fails(concat(u32(0x184c2102), compressed([0x50, ...ascii("hello")])), "Unsupported")
      })
    })

    describe("Frame: interoperability (python-lz4 4.4.4, liblz4 1.9.4)", () => {
      const big = (): Uint8Array => {
        const data = mixed()
        return concat(data, data, data)
      }

      it("decodes linked 64 KB blocks with Content Size and Content Checksum", () => {
        frames.decodes(fixture("lz4/frame-linked.lz4"), big())
      })

      it("decodes independent 64 KB blocks with Block Checksums", () => {
        frames.decodes(fixture("lz4/frame-independent.lz4"), big())
      })

      it("decodes an incompressible frame stored as an uncompressed block", () => {
        const input = hex(
          "04224d186440a740000080420282061a2359b62a3bca3d09243efebfff359b88e88a99e764043520d9c377d17b3d6a22a7e5dd" +
            "548515b622035c344cf39a704caaf783607991f9cd8f7cc20000000006c65a72"
        )
        frames.decodes(input, xorshift(64, 2))
      })
    })

    describe("Frame: decoder policy", () => {
      it("rejects bytes after the last frame that do not start another frame", () => {
        frames.fails(concat(hello(HEADER.independent), [0x00]), "Malformed")
        frames.fails(concat(hello(HEADER.independent), [0x00, 0x00, 0x00, 0x00]), "Malformed")
      })

      it("returns a buffer that does not share memory with the input", () => {
        const input = hello(HEADER.independent)
        const result = Compression.decompressLz4Frame(input, { maxOutputSize: 1 << 20 })
        assert.isTrue(Result.isSuccess(result))
        if (Result.isSuccess(result)) assert.notStrictEqual(result.success.buffer, input.buffer)
      })
    })

    describe("Frame: resource limits (local policy)", () => {
      it("fails with OutputLimit when a Content Size exceeds maxOutputSize, before decoding", () => {
        // 2^40 bytes and no data blocks
        frames.fails(hex(HEADER.contentSize2e40), "OutputLimit", { maxOutputSize: 1024 })
      })

      it("fails with OutputLimit when the frames expand past maxOutputSize", () => {
        const input = concat(hello(HEADER.independent), hello(HEADER.independent))
        frames.fails(input, "OutputLimit", { maxOutputSize: 9 })
        frames.decodes(input, ascii("hellohello"), { maxOutputSize: 10 })
      })
    })
  })
}
