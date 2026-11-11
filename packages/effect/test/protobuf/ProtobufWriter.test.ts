import { assert, describe, it } from "@effect/vitest"
import * as Hex from "effect/encoding/Hex"
import { ProtobufReader, ProtobufWriter } from "effect/protobuf"

const write = (f: (w: ProtobufWriter.ProtobufWriter) => void): string => {
  const w = ProtobufWriter.make()
  f(w)
  return Hex.encode(w.finish())
}

const roundTrip = <A>(
  writeValue: (w: ProtobufWriter.ProtobufWriter, value: A) => void,
  readValue: (r: ProtobufReader.ProtobufReader) => A,
  value: A
): A => {
  const w = ProtobufWriter.make()
  writeValue(w, value)
  const r = ProtobufReader.make(w.finish())
  const out = readValue(r)
  assert.isTrue(r.isDone())
  return out
}

describe("ProtobufWriter", () => {
  // Encodings from https://protobuf.dev/programming-guides/encoding/
  it.each([
    ["uint32 150", (w: ProtobufWriter.ProtobufWriter) => w.uint32(150), "9601"],
    ["uint32 max", (w: ProtobufWriter.ProtobufWriter) => w.uint32(4294967295), "ffffffff0f"],
    ["int32 -1 as ten bytes", (w: ProtobufWriter.ProtobufWriter) => w.int32(-1), "ffffffffffffffffff01"],
    ["sint32 -1", (w: ProtobufWriter.ProtobufWriter) => w.sint32(-1), "01"],
    ["sint32 1", (w: ProtobufWriter.ProtobufWriter) => w.sint32(1), "02"],
    ["sint32 -2147483648", (w: ProtobufWriter.ProtobufWriter) => w.sint32(-2147483648), "ffffffff0f"],
    ["int64 -1n", (w: ProtobufWriter.ProtobufWriter) => w.int64(-1n), "ffffffffffffffffff01"],
    ["int64 2^53 as number", (w: ProtobufWriter.ProtobufWriter) => w.int64(2 ** 53), "8080808080808010"],
    ["uint64 max", (w: ProtobufWriter.ProtobufWriter) => w.uint64(2n ** 64n - 1n), "ffffffffffffffffff01"],
    ["sint64 -2^63", (w: ProtobufWriter.ProtobufWriter) => w.sint64(-(2n ** 63n)), "ffffffffffffffffff01"],
    ["bool true", (w: ProtobufWriter.ProtobufWriter) => w.bool(true), "01"],
    ["fixed32 1", (w: ProtobufWriter.ProtobufWriter) => w.fixed32(1), "01000000"],
    ["sfixed32 -2", (w: ProtobufWriter.ProtobufWriter) => w.sfixed32(-2), "feffffff"],
    ["fixed64 1n", (w: ProtobufWriter.ProtobufWriter) => w.fixed64(1n), "0100000000000000"],
    ["sfixed64 -2n", (w: ProtobufWriter.ProtobufWriter) => w.sfixed64(-2n), "feffffffffffffff"],
    ["float 1", (w: ProtobufWriter.ProtobufWriter) => w.float(1), "0000803f"],
    ["double 1", (w: ProtobufWriter.ProtobufWriter) => w.double(1), "000000000000f03f"],
    ["tag 1 varint", (w: ProtobufWriter.ProtobufWriter) => w.tag(1, ProtobufWriter.WireType.Varint), "08"],
    ["tag 16 len", (w: ProtobufWriter.ProtobufWriter) => w.tag(16, ProtobufWriter.WireType.Len), "8201"],
    ["string testing", (w: ProtobufWriter.ProtobufWriter) => w.string("testing"), "0774657374696e67"],
    ["string with a lone surrogate", (w: ProtobufWriter.ProtobufWriter) => w.string("a\uD800"), "0461efbfbd"],
    ["bytes", (w: ProtobufWriter.ProtobufWriter) => w.bytes(new Uint8Array([1, 2])), "020102"]
  ])("writes %s", (_, f, hex) => {
    assert.strictEqual(write(f), hex)
  })

  it("widens the length prefix of a delimited value over 127 bytes", () => {
    const w = ProtobufWriter.make()
    w.tag(1, ProtobufWriter.WireType.Len)
    const start = w.beginDelimited()
    w.bytes(new Uint8Array(200))
    w.endDelimited(start)
    w.tag(2, ProtobufWriter.WireType.Varint)
    w.uint32(7)
    const r = ProtobufReader.make(w.finish())
    r.tag()
    const inner = r.delimited()
    assert.strictEqual(inner.bytes().length, 200)
    assert.isTrue(inner.isDone())
    assert.strictEqual(ProtobufReader.fieldNumber(r.tag()), 2)
    assert.strictEqual(r.uint32(), 7)
  })

  it("round-trips strings longer than the short-string path", () => {
    const value = "héllo wörld, 日本語 and 😀 ".repeat(5)
    assert.strictEqual(roundTrip((w, s) => w.string(s), (r) => r.string(), value), value)
  })

  it("starts over after finish", () => {
    const w = ProtobufWriter.make()
    w.uint32(1)
    assert.strictEqual(Hex.encode(w.finish()), "01")
    w.uint32(2)
    assert.strictEqual(Hex.encode(w.finish()), "02")
  })

  it("keeps writers created before another one finishes apart", () => {
    const a = ProtobufWriter.make()
    a.uint32(1)
    const b = ProtobufWriter.make()
    b.uint32(2)
    assert.strictEqual(Hex.encode(a.finish()), "01")
    const c = ProtobufWriter.make()
    c.uint32(3)
    assert.strictEqual(Hex.encode(b.finish()), "02")
    assert.strictEqual(Hex.encode(c.finish()), "03")
  })

  it("grows past its initial buffer", () => {
    const value = new Uint8Array(5000).fill(7)
    assert.deepStrictEqual(roundTrip((w, b) => w.bytes(b), (r) => r.bytes(), value), value)
  })
})
