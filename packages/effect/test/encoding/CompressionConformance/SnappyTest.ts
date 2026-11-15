/**
 * Conformance of `Compression.decompressSnappy` to the Snappy raw block format.
 *
 * Specification: google/snappy `format_description.txt` at tag 1.2.2
 * (https://github.com/google/snappy/blob/1.2.2/format_description.txt),
 * "Last revised: 2011-10-05". Section ids such as "§2.2.1" are the numbered
 * sections of that file, linked by line.
 *
 * The fixtures come from `test/fixtures/compression/snappy/generate.py`
 * (cramjam 2.11.0). They are interoperability evidence, not a replacement for
 * the assertion tests; malformed input and encodings the reference encoder
 * does not emit (4-byte offsets, 3 and 4 extra literal length bytes) are
 * hand-crafted.
 *
 * Not covered:
 * - The Snappy framing format (`framing_format.txt`, `.sz` streams): not
 *   part of the raw format, and not supported by this module.
 * - §2 "the stream naturally cannot start with a copy" is covered as a copy
 *   reaching before the start of the output, which is how it fails.
 * - §2.2 compressor notes (32 kB blocks, offsets below about 32768): they
 *   describe the encoder; the decoder accepts larger offsets (§2.2.3 test).
 * - Decoder policy, not spec requirements: data that ends before the
 *   preamble length fails with `Malformed`, bytes after the data reaches the
 *   preamble length fail with `Malformed`, and a preamble above
 *   `maxOutputSize` fails with `OutputLimit` before any data is decoded.
 */
import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Compression from "effect/encoding/Compression"
import { ascii, assertions, concat, fixture, hex, le, mixed, xorshift } from "./CompressionConformance.ts"

const { decodes: assertDecodes, fails: assertFails } = assertions(Compression.decompressSnappy, "Snappy")

const varint = (n: number): Array<number> => {
  const out: Array<number> = []
  while (n >= 0x80) {
    out.push((n & 0x7f) | 0x80)
    n >>>= 7
  }
  out.push(n)
  return out
}

// Literal tags: up to 60 bytes in the tag, else 1 to 4 extra length bytes
const literal = (data: Uint8Array): Uint8Array => {
  const n = data.length - 1
  if (n < 60) return concat([n << 2], data)
  const bytes = n < 0x100 ? 1 : n < 0x10000 ? 2 : n < 0x1000000 ? 3 : 4
  return concat([(59 + bytes) << 2], le(n, bytes), data)
}
const copy1 = (length: number, offset: number) => [((offset >>> 8) << 5) | ((length - 4) << 2) | 1, offset & 0xff]
const copy2 = (length: number, offset: number) => [((length - 1) << 2) | 2, ...le(offset, 2)]
const copy4 = (length: number, offset: number) => [((length - 1) << 2) | 3, ...le(offset, 4)]

export const suite = (): void => {
  describe("Snappy (format_description.txt, google/snappy 1.2.2)", () => {
    // https://github.com/google/snappy/blob/1.2.2/format_description.txt#L18
    describe("Preamble (§1)", () => {
      it("decodes the uncompressed length as a little-endian varint", () => {
        // 200 = 0xc8 0x01
        const data = xorshift(200, 3)
        assertDecodes(concat([0xc8, 0x01], literal(data)), data)
      })

      it("decodes a preamble of 0 with no elements as empty output", () => {
        assertDecodes(hex("00"), new Uint8Array(0))
      })

      it("MUST reject a preamble above 2^32 - 1", () => {
        // 2^32
        assertFails(hex("8080808010"), "Malformed")
        // A sixth varint byte
        assertFails(hex("808080808000"), "Malformed")
      })

      it("MUST reject input that ends inside the preamble", () => {
        assertFails(new Uint8Array(0), "Truncated")
        assertFails(hex("ff"), "Truncated")
      })

      it("MUST reject elements that produce more data than the preamble length", () => {
        assertFails(concat([4], literal(ascii("hello"))), "Malformed")
        assertFails(concat([5], literal(ascii("hel")), copy2(3, 1)), "Malformed")
      })
    })

    // https://github.com/google/snappy/blob/1.2.2/format_description.txt#L28
    describe("Elements (§2)", () => {
      it("decodes consecutive literals", () => {
        assertDecodes(concat([10], literal(ascii("hello")), literal(ascii("world"))), ascii("helloworld"))
      })

      it("MUST reject input that ends inside an element", () => {
        // Literal: extra length byte, then data
        assertFails(hex("0af0"), "Truncated")
        assertFails(concat([5], [4 << 2], ascii("hell")), "Truncated")
        // Copies: their offset bytes
        assertFails(concat([8], literal(ascii("abcd")), [0x01]), "Truncated")
        assertFails(concat([8], literal(ascii("abcd")), [0x0e, 0x04]), "Truncated")
        assertFails(concat([8], literal(ascii("abcd")), [0x0f, 0x04, 0x00, 0x00]), "Truncated")
      })
    })

    // https://github.com/google/snappy/blob/1.2.2/format_description.txt#L46
    describe("Literals (§2.1)", () => {
      it("decodes a literal of up to 60 bytes with its length in the tag", () => {
        const data = xorshift(60, 4)
        assertDecodes(concat([60], literal(data)), data)
      })

      it("decodes a literal with 1, 2, 3 or 4 extra length bytes", () => {
        for (const length of [61, 300, 70_000]) {
          const data = xorshift(length, length)
          assertDecodes(concat(varint(length), literal(data)), data)
        }
        // A 4-byte length is only needed above 16 MiB; the format does not
        // require the shortest form, so a small length is used
        assertDecodes(hex("03fc02000000616263"), ascii("abc"))
      })
    })

    // https://github.com/google/snappy/blob/1.2.2/format_description.txt#L62
    describe("Copies (§2.2)", () => {
      it("decodes a copy longer than its offset as a repetition", () => {
        // The spec's example: "xababab" = <literal: "xab"> <copy: offset=2 length=4>
        assertDecodes(concat([7], literal(ascii("xab")), copy1(4, 2)), ascii("xababab"))
      })

      it("MUST reject a copy with offset 0", () => {
        const prefix = concat([12], literal(ascii("abcd")))
        assertFails(concat(prefix, copy1(4, 0)), "Malformed")
        assertFails(concat(prefix, copy2(4, 0)), "Malformed")
        assertFails(concat(prefix, copy4(4, 0)), "Malformed")
      })

      it("MUST reject a copy that reaches before the start of the output", () => {
        // A copy as the first element
        assertFails(concat([4], copy1(4, 1)), "Malformed")
        assertFails(concat([12], literal(ascii("abcd")), copy2(8, 5)), "Malformed")
      })

      // https://github.com/google/snappy/blob/1.2.2/format_description.txt#L89
      it("decodes a copy with a 1-byte offset: 11-bit offset, length 4 to 11", () => {
        const data = xorshift(261, 5)
        assertDecodes(concat(varint(272), literal(data), copy1(11, 261)), concat(data, data.subarray(0, 11)))
      })

      // https://github.com/google/snappy/blob/1.2.2/format_description.txt#L98
      it("decodes a copy with a 2-byte offset: length 1 to 64", () => {
        const data = xorshift(300, 6)
        assertDecodes(
          concat(varint(365), literal(data), copy2(64, 300), copy2(1, 1)),
          concat(data, data.subarray(0, 64), data.subarray(63, 64))
        )
      })

      // https://github.com/google/snappy/blob/1.2.2/format_description.txt#L106
      it("decodes a copy with a 4-byte offset", () => {
        const data = xorshift(70_000, 7)
        assertDecodes(concat(varint(70_010), literal(data), copy4(10, 70_000)), concat(data, data.subarray(0, 10)))
      })
    })

    describe("Interoperability (cramjam 2.11.0)", () => {
      it("decodes data compressed by the reference encoder", () => {
        assertDecodes(fixture("snappy/mixed.snappy"), mixed())
        assertDecodes(
          hex(
            "64f063420282061a2359b62a3bca3d09243efebfff359b88e88a99e764043520d9c377d17b3d6a22a7e5dd548515b622035c34" +
              "4cf39a704caaf783607991f9cd8f7cc226308256198de773dc9e353b5d9ad1d60ca243aadd835351ef8e58b7ffb240424d483dc7"
          ),
          xorshift(100, 2)
        )
      })
    })

    describe("Decoder policy", () => {
      it("rejects data that ends before the preamble length", () => {
        assertFails(concat([6], literal(ascii("hello"))), "Malformed")
      })

      it("rejects bytes left after the data reaches the preamble length", () => {
        // A lone tag byte, which would otherwise be a truncated literal
        assertFails(concat([5], literal(ascii("hello")), [0x00]), "Malformed")
      })

      it("returns a buffer that does not share memory with the input", () => {
        const input = concat([5], literal(ascii("hello")))
        const result = Compression.decompressSnappy(input, { maxOutputSize: 1 << 20 })
        assert.isTrue(Result.isSuccess(result))
        if (Result.isSuccess(result)) assert.notStrictEqual(result.success.buffer, input.buffer)
      })
    })

    describe("Resource limits (local policy)", () => {
      it("fails with OutputLimit when the preamble exceeds maxOutputSize, before decoding", () => {
        // 2^32 - 1 with no data: the limit is checked before the data
        assertFails(hex("ffffffff0f"), "OutputLimit", { maxOutputSize: 1024 })
        assertDecodes(concat([5], literal(ascii("hello"))), ascii("hello"), { maxOutputSize: 5 })
      })

      it("fails with SizeMismatch when the preamble differs from expectedSize", () => {
        const input = concat([5], literal(ascii("hello")))
        assertFails(input, "SizeMismatch", { maxOutputSize: 1024, expectedSize: 4 })
        assertFails(input, "SizeMismatch", { maxOutputSize: 1024, expectedSize: 6 })
      })
    })
  })
}
