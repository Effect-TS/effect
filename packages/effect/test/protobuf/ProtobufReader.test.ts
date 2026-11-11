import { assert, describe, it } from "@effect/vitest"
import * as Hex from "effect/encoding/Hex"
import { ProtobufReader, ProtobufWriter } from "effect/protobuf"
import * as Result from "effect/Result"

const reader = (hex: string) => ProtobufReader.make(Result.getOrThrow(Hex.decode(hex)))

const failure = (hex: string, f: (r: ProtobufReader.ProtobufReader) => unknown): string => {
  try {
    f(reader(hex))
  } catch (e) {
    assert.instanceOf(e, ProtobufReader.ProtobufReaderError)
    return e.message
  }
  throw new Error("expected a ProtobufReaderError")
}

describe("ProtobufReader", () => {
  it.each([
    ["uint32 150", "9601", (r: ProtobufReader.ProtobufReader) => r.uint32(), 150],
    [
      "uint32 of a ten-byte varint, truncated",
      "ffffffffffffffffff01",
      (r: ProtobufReader.ProtobufReader) => r.uint32(),
      4294967295
    ],
    ["int32 -1", "ffffffffffffffffff01", (r: ProtobufReader.ProtobufReader) => r.int32(), -1],
    ["sint32 -1", "01", (r: ProtobufReader.ProtobufReader) => r.sint32(), -1],
    ["sint32 -2147483648", "ffffffff0f", (r: ProtobufReader.ProtobufReader) => r.sint32(), -2147483648],
    ["int64 -1n", "ffffffffffffffffff01", (r: ProtobufReader.ProtobufReader) => r.int64(), -1n],
    ["uint64 max", "ffffffffffffffffff01", (r: ProtobufReader.ProtobufReader) => r.uint64(), 2n ** 64n - 1n],
    ["sint64 -2^63", "ffffffffffffffffff01", (r: ProtobufReader.ProtobufReader) => r.sint64(), -(2n ** 63n)],
    ["sint64 2^63 - 1", "feffffffffffffffff01", (r: ProtobufReader.ProtobufReader) => r.sint64(), 2n ** 63n - 1n],
    ["bool of a nonzero high half", "8080808010", (r: ProtobufReader.ProtobufReader) => r.bool(), true],
    ["fixed32 max", "ffffffff", (r: ProtobufReader.ProtobufReader) => r.fixed32(), 4294967295],
    ["sfixed32 -2", "feffffff", (r: ProtobufReader.ProtobufReader) => r.sfixed32(), -2],
    ["fixed64 max", "ffffffffffffffff", (r: ProtobufReader.ProtobufReader) => r.fixed64(), 2n ** 64n - 1n],
    ["sfixed64 -2n", "feffffffffffffff", (r: ProtobufReader.ProtobufReader) => r.sfixed64(), -2n],
    ["float 1", "0000803f", (r: ProtobufReader.ProtobufReader) => r.float(), 1],
    ["double -0.5", "000000000000e0bf", (r: ProtobufReader.ProtobufReader) => r.double(), -0.5],
    ["string testing", "0774657374696e67", (r: ProtobufReader.ProtobufReader) => r.string(), "testing"]
  ])("reads %s", (_, hex, read, expected) => {
    const r = reader(hex)
    assert.strictEqual(read(r), expected)
    assert.isTrue(r.isDone())
  })

  it("reads bytes as a copy", () => {
    const input = new Uint8Array([2, 1, 2])
    const bytes = ProtobufReader.make(input).bytes()
    input[1] = 9
    assert.deepStrictEqual(bytes, new Uint8Array([1, 2]))
  })

  it("splits a tag into its field number and wire type", () => {
    const tag = reader("8201").tag()
    assert.strictEqual(ProtobufReader.fieldNumber(tag), 16)
    assert.strictEqual(ProtobufReader.wireType(tag), ProtobufReader.WireType.Len)
  })

  it("skips every wire type, including nested groups", () => {
    const w = ProtobufWriter.make()
    w.tag(1, ProtobufWriter.WireType.Varint)
    w.int64(-1n)
    w.tag(2, ProtobufWriter.WireType.I64)
    w.double(1)
    w.tag(3, ProtobufWriter.WireType.Len)
    w.string("skipped")
    w.tag(4, ProtobufWriter.WireType.StartGroup)
    w.tag(5, ProtobufWriter.WireType.StartGroup)
    w.tag(1, ProtobufWriter.WireType.I32)
    w.fixed32(1)
    w.tag(5, ProtobufWriter.WireType.EndGroup)
    w.tag(4, ProtobufWriter.WireType.EndGroup)
    w.tag(6, ProtobufWriter.WireType.Varint)
    w.uint32(42)
    const r = ProtobufReader.make(w.finish())
    for (let i = 0; i < 4; i++) r.skip(r.tag())
    assert.strictEqual(ProtobufReader.fieldNumber(r.tag()), 6)
    assert.strictEqual(r.uint32(), 42)
    assert.isTrue(r.isDone())
  })

  it.each([
    [
      "a truncated varint",
      "96",
      (r: ProtobufReader.ProtobufReader) => r.uint32(),
      "Expected a complete value at offset 1"
    ],
    [
      "a varint longer than ten bytes",
      "ffffffffffffffffffff01",
      (r: ProtobufReader.ProtobufReader) => r.int64(),
      "Expected a varint of at most 10 bytes at offset 10"
    ],
    [
      "a truncated fixed64",
      "01020304",
      (r: ProtobufReader.ProtobufReader) => r.fixed64(),
      "Expected a complete value at offset 0"
    ],
    [
      "a length past the end",
      "0561",
      (r: ProtobufReader.ProtobufReader) => r.string(),
      "Expected a complete value at offset 1"
    ],
    [
      "a length over 32 bits",
      "ffffffff1f",
      (r: ProtobufReader.ProtobufReader) => r.bytes(),
      "Expected a varint of at most 32 bits at offset 5"
    ],
    ["invalid UTF-8", "01ff", (r: ProtobufReader.ProtobufReader) => r.string(), "Expected valid UTF-8 at offset 1"],
    [
      "field number 0",
      "00",
      (r: ProtobufReader.ProtobufReader) => r.tag(),
      "Expected a tag with a nonzero field number and a wire type up to 5 at offset 1"
    ],
    [
      "wire type 6",
      "0e",
      (r: ProtobufReader.ProtobufReader) => r.tag(),
      "Expected a tag with a nonzero field number and a wire type up to 5 at offset 1"
    ],
    [
      "an end group tag without a start",
      "0c",
      (r: ProtobufReader.ProtobufReader) => r.skip(r.tag()),
      "Expected a start group tag before the end group tag of field 1 at offset 1"
    ],
    [
      "a mismatched end group tag",
      "0b14",
      (r: ProtobufReader.ProtobufReader) => r.skip(r.tag()),
      "Expected an end group tag for field 1 at offset 2"
    ],
    [
      "an unterminated group",
      "0b",
      (r: ProtobufReader.ProtobufReader) => r.skip(r.tag()),
      "Expected a complete value at offset 1"
    ]
  ])("rejects %s", (_, hex, read, message) => {
    assert.strictEqual(failure(hex, read), message)
  })

  it("rejects groups nested deeper than 512", () => {
    const w = ProtobufWriter.make()
    for (let i = 0; i < 513; i++) w.tag(1, ProtobufWriter.WireType.StartGroup)
    const r = ProtobufReader.make(w.finish())
    assert.throws(() => r.skip(r.tag()), /groups nested at most 512 deep/)
  })
})
