/**
 * Conformance of `Compression.decompressGzip` to the gzip file format.
 *
 * Specification: RFC 1952, GZIP file format specification version 4.3
 * (https://www.rfc-editor.org/rfc/rfc1952), whose members hold deflate data
 * as specified by RFC 1951, DEFLATE Compressed Data Format Specification
 * version 1.3 (https://www.rfc-editor.org/rfc/rfc1951).
 *
 * The inline hex fixtures come from
 * `test/fixtures/compression/gzip/generate.py` (CPython 3.13.15, zlib 1.3.2),
 * and the interoperability tests compress data at test time with the
 * runtime's `CompressionStream("gzip")`. Fixtures are interoperability
 * evidence, not a replacement for the assertion tests; malformed input and
 * header fields that reference encoders do not emit are hand-crafted.
 *
 * Not covered:
 * - RFC 1952 §2.3.1 ISIZE "modulo 2^32": needs more than 4 GiB of output.
 * - RFC 1952 §2.3.1.1 extra field subfields (SI1, SI2, LEN): the field is
 *   skipped as a whole by XLEN, as §2.3.1.2 allows; subfields are not
 *   validated.
 * - RFC 1952 §2.3.1 FTEXT, MTIME, XFL, OS and the contents of FNAME and
 *   FCOMMENT: informational, and this API returns only the data. One test
 *   checks they are ignored.
 * - RFC 1952 §2.3.1.2 CM values other than 8: the RFC defines no other
 *   method, so they are rejected rather than reported as unsupported.
 * - Decoder policy, not RFC requirements: bytes after the last member that do
 *   not form a member are Malformed (gzip(1) ignores trailing zeros), and the
 *   CRC-32, ISIZE and FHCRC are always verified (§2.3.1.2 lets a decoder skip
 *   them).
 * - RFC 1951 Huffman code construction and every length and distance code:
 *   the inflater is shared with `effect/encoding/Zip` and tested in
 *   `test/encoding/Zip.test.ts`; each block type is covered once here.
 */
import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Compression from "effect/encoding/Compression"
import { ascii, assertions, concat, hex, xorshift } from "./CompressionConformance.ts"

// generate.py output
const fixtures = {
  stored: hex("1f8b08000000000000ff010c00f3ff73746f72656420626c6f636b94a3243d0c000000"),
  fixed: hex("1f8b08000000000000ff4bcbac484d51f0284d4bcb4dcc5348ce4f492dd65148c314040005644f4d28000000"),
  dynamic: hex(
    "1f8b08000000000000ffc5cacb1540301005d0565e05a9c242011a18f9102413c904513d4713767771bb1629788dbe3a172842" +
      "b3b1056428098421b385212185eebf38bcdaabd72bc6cc6784e30b4b0da9800f9bbfb8d1dd6078520f08205e62d0000000"
  ),
  multiBlock: hex("1f8b08000000000000ff4acb2c2a2e5148cac94fced65100000000ffffcb492c2e5148cac94fce0600fe76fe4117000000"),
  run: hex("1f8b08000000000000ff4b4c1c05a360140c77000003da389ae8030000"),
  empty: hex("1f8b08000000000002ff03000000000000000000"),
  name: hex("1f8b08080000000002ff68656c6c6f2e74787400cb48cdc9c9d751c84bcc4d0500beb97b380b000000"),
  allFlags: hex(
    "1f8b081f00f15365020308004150040001020304646174612e747874006120636f6d6d656e7400bd22cb48cdc9c9d751c848" +
      "4d4c492d02003abd6e470d000000"
  ),
  headerCrc: hex("1f8b08020000000000ff90c9cb48cdc9c9d751c8484d4c492d52700e720600db8b24d511000000"),
  members: hex(
    "1f8b08000000000002ffcbcf4b5500004961ac23040000001f8b08000000000002ff030000000000000000001f8b08000000" +
      "000002ff2b29cf0700668aca1103000000"
  )
}

const dynamicText = "Dynamic Huffman codes adapt to the data. ".repeat(4) +
  "The quick brown fox jumps over the lazy dog."

// The fixed part of a member header, with the given FLG
const header = (flg = "00"): string => `1f8b08${flg}0000000000ff`

// A member with `deflate` as its data; the decoder fails before the trailer
const withDeflate = (deflate: string): Uint8Array => hex(header() + deflate + "0000000000000000")

// The stored fixture behind another header
const withHeader = (replacement: string): Uint8Array => concat(hex(replacement), fixtures.stored.subarray(10))

const patch = (bytes: Uint8Array, index: number, value: number): Uint8Array => {
  const out = bytes.slice()
  out[index] = value
  return out
}

const { decodes: assertDecodes, fails: assertFails } = assertions(Compression.decompressGzip, "Gzip", {
  maxOutputSize: 1 << 24
})

const compress = async (data: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(
    await new Response(new Blob([data.slice()]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer()
  )

export const suite = (): void => {
  describe("Gzip (RFC 1952 v4.3, RFC 1951 v1.3)", () => {
    // https://www.rfc-editor.org/rfc/rfc1952#section-2.2
    describe("File format (RFC 1952 §2.2)", () => {
      it("decodes a series of members as the concatenation of their data", () => {
        // "one " + an empty member + "two"
        assertDecodes(fixtures.members, "one two")
      })

      it("decodes a member with no data", () => {
        assertDecodes(fixtures.empty, new Uint8Array(0))
      })

      it("rejects empty input, which holds no member", () => {
        assertFails(new Uint8Array(0), "Truncated")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc1952#section-2.3.1
    // https://www.rfc-editor.org/rfc/rfc1952#section-2.3.1.2
    describe("Member header (RFC 1952 §2.3.1)", () => {
      it("MUST reject a member whose ID1 is not 31 or ID2 is not 139", () => {
        assertFails(patch(fixtures.stored, 0, 0x1e), "Malformed")
        assertFails(patch(fixtures.stored, 1, 0x8c), "Malformed")
      })

      it("MUST reject a member whose CM is not 8 (deflate)", () => {
        for (const cm of [0, 7, 9, 255]) assertFails(patch(fixtures.stored, 2, cm), "Malformed")
      })

      it("MUST reject a member with a reserved FLG bit (5, 6 or 7) set", () => {
        for (const bit of [0x20, 0x40, 0x80]) assertFails(patch(fixtures.stored, 3, bit), "Malformed")
      })

      it("ignores FTEXT, MTIME, XFL and OS", () => {
        // FLG FTEXT, MTIME 2^32 - 1, XFL 4 (fastest), OS 11 (NTFS)
        assertDecodes(withHeader("1f8b0801ffffffff040b"), "stored block")
      })

      // https://www.rfc-editor.org/rfc/rfc1952#section-2.3.1.1
      it("skips an FEXTRA field of XLEN bytes, whatever its bytes", () => {
        assertDecodes(withHeader(header("04") + "0000"), "stored block")
        // Bytes that look like a terminator or a new member
        assertDecodes(withHeader(header("04") + "0600001f8b080000"), "stored block")
      })

      it("skips a zero-terminated FNAME", () => {
        assertDecodes(fixtures.name, "hello, name")
      })

      it("skips a zero-terminated FCOMMENT of ISO 8859-1 text", () => {
        assertDecodes(withHeader(header("10") + "e9200a00"), "stored block")
      })

      it("reads the optional fields in the order FEXTRA, FNAME, FCOMMENT, FHCRC", () => {
        assertDecodes(fixtures.allFlags, "hello, header")
      })

      it("accepts an FHCRC equal to the low 16 bits of the CRC-32 of the header", () => {
        assertDecodes(fixtures.headerCrc, "hello, header CRC")
      })

      it("rejects an FHCRC that does not match the header", () => {
        // Bytes 10 and 11 hold the CRC16 of the first ten bytes
        assertFails(patch(fixtures.headerCrc, 10, fixtures.headerCrc[10] ^ 1), "Checksum")
        // A changed MTIME no longer matches the CRC16
        assertFails(patch(fixtures.headerCrc, 4, 1), "Checksum")
      })
    })

    // https://www.rfc-editor.org/rfc/rfc1952#section-2.3.1
    describe("Member trailer (RFC 1952 §2.3.1)", () => {
      const end = fixtures.stored.length

      it("rejects data whose CRC-32 differs from CRC32", () => {
        assertFails(patch(fixtures.stored, end - 8, fixtures.stored[end - 8] ^ 1), "Checksum")
        // A changed byte inside the stored block is still valid deflate
        assertFails(patch(fixtures.stored, 15, 0x53), "Checksum")
      })

      it("rejects data whose size modulo 2^32 differs from ISIZE", () => {
        assertFails(patch(fixtures.stored, end - 4, 13), "Malformed")
      })
    })

    describe("Truncation", () => {
      // https://www.rfc-editor.org/rfc/rfc1952#section-2.3
      it("rejects every proper prefix of a member", () => {
        for (const member of [fixtures.allFlags, fixtures.stored, fixtures.dynamic, fixtures.multiBlock]) {
          for (let length = 0; length < member.length; length++) {
            assertFails(member.subarray(0, length), "Truncated")
          }
        }
      })

      // https://www.rfc-editor.org/rfc/rfc1952#section-2.2
      it("rejects a member cut short after a complete member", () => {
        const first = 24
        for (const length of [first + 1, first + 2, first + 10, fixtures.members.length - 1]) {
          assertFails(fixtures.members.subarray(0, length), "Truncated")
        }
      })
    })

    // https://www.rfc-editor.org/rfc/rfc1951#section-3.2
    describe("Deflate data (RFC 1951 §3.2)", () => {
      // https://www.rfc-editor.org/rfc/rfc1951#section-3.2.4
      it("decodes a non-compressed block (BTYPE 00)", () => {
        assertDecodes(fixtures.stored, "stored block")
      })

      // https://www.rfc-editor.org/rfc/rfc1951#section-3.2.4
      it("rejects a non-compressed block whose NLEN is not the complement of LEN", () => {
        assertFails(withDeflate("010500fbff68656c6c6f"), "Malformed")
      })

      // https://www.rfc-editor.org/rfc/rfc1951#section-3.2.6
      it("decodes a block compressed with fixed Huffman codes (BTYPE 01)", () => {
        assertDecodes(fixtures.fixed, "fixed Huffman codes, fixed Huffman codes")
      })

      // https://www.rfc-editor.org/rfc/rfc1951#section-3.2.7
      it("decodes a block compressed with dynamic Huffman codes (BTYPE 10)", () => {
        assertDecodes(fixtures.dynamic, dynamicText)
      })

      // https://www.rfc-editor.org/rfc/rfc1951#section-3.2.3
      it("decodes blocks up to the one with BFINAL set", () => {
        // A block, an empty non-compressed block from a full flush, the last block
        assertDecodes(fixtures.multiBlock, "first block, last block")
      })

      // https://www.rfc-editor.org/rfc/rfc1951#section-3.2.3
      it("rejects a block of the reserved BTYPE 11", () => {
        assertFails(withDeflate("07"), "Malformed")
      })

      // https://www.rfc-editor.org/rfc/rfc1951#section-3.2.5
      it("decodes matches that overlap the bytes they copy", () => {
        assertDecodes(fixtures.run, new Uint8Array(1000).fill(0x61))
      })

      // https://www.rfc-editor.org/rfc/rfc1951#section-3.2.5
      it("rejects a distance that reaches before the start of the data", () => {
        // A fixed Huffman block whose first symbol is a match of length 3 at distance 1
        assertFails(withDeflate("030200"), "Malformed")
      })
    })

    // RFC 1952 §2.2 defines a file as a series of members and says nothing of
    // other bytes. gzip(1) ignores trailing zeros with a warning; this decoder
    // must consume the whole input.
    describe("Trailing data (decoder policy)", () => {
      it("rejects bytes after the last member that do not form a member", () => {
        for (const trailing of [[0], [0, 0, 0, 0], [0x1f, 0x00], [0x42]]) {
          assertFails(concat(fixtures.stored, trailing), "Malformed")
        }
      })
    })

    describe("Interoperability", () => {
      // https://compression.spec.whatwg.org/#compression-stream
      it("decodes the output of CompressionStream(\"gzip\")", async () => {
        const words = ascii("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ")
        const prose = new Uint8Array(300_000)
        const random = xorshift(300_000, 1)
        // Repeated text whose matches cross the inflater's 64 KiB output chunks
        for (let i = 0; i < prose.length; i++) prose[i] = words[(i * 7 + (i >>> 10)) % words.length]
        const mixed = concat(prose.subarray(0, 50_000), random.subarray(0, 50_000), new Uint8Array(200_000))
        for (const data of [new Uint8Array(0), ascii("a"), prose, random, new Uint8Array(1 << 20), mixed]) {
          assertDecodes(await compress(data), data)
        }
      })
    })

    describe("Resource limits (local policy)", () => {
      it("fails with OutputLimit when the output exceeds maxOutputSize", () => {
        assertFails(fixtures.run, "OutputLimit", { maxOutputSize: 999 })
        // The limit applies to all members together
        assertFails(fixtures.members, "OutputLimit", { maxOutputSize: 6 })
      })

      it("decodes output of exactly maxOutputSize bytes", () => {
        assertDecodes(fixtures.run, new Uint8Array(1000).fill(0x61), { maxOutputSize: 1000 })
      })

      it("fails with SizeMismatch when the output differs from expectedSize", () => {
        assertFails(fixtures.run, "SizeMismatch", { maxOutputSize: 2000, expectedSize: 999 })
        assertFails(fixtures.run, "SizeMismatch", { maxOutputSize: 2000, expectedSize: 1001 })
      })

      it("returns output that does not share memory with the input", () => {
        const result = Compression.decompressGzip(fixtures.stored, { maxOutputSize: 1 << 24 })
        assert.isTrue(Result.isSuccess(result))
        if (Result.isSuccess(result)) assert.notStrictEqual(result.success.buffer, fixtures.stored.buffer)
      })
    })
  })
}
