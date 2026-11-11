import { assert, describe, it } from "@effect/vitest"
import * as Hex from "effect/encoding/Hex"
import { ProtobufWriter } from "effect/protobuf"

type Writer = ProtobufWriter.ProtobufWriter

const write = (f: (w: Writer) => unknown): string => {
  const w = ProtobufWriter.make()
  f(w)
  return Hex.encode(w.finish())
}

describe("ProtobufWriter", () => {
  // Encodings from https://protobuf.dev/programming-guides/encoding/
  it.each<[string, (w: Writer) => unknown, string]>([
    ["tag 16 len", (w) => w.tag(16, ProtobufWriter.WireType.Len), "8201"],
    ["uint32 max", (w) => w.uint32(4294967295), "ffffffff0f"],
    ["int32 -1 as ten bytes", (w) => w.int32(-1), "ffffffffffffffffff01"],
    ["int32 2^31, wrapped", (w) => w.int32(2 ** 31), "80808080f8ffffffff01"],
    ["int32 NaN as 0", (w) => w.int32(NaN), "00"],
    ["sint32 -2147483648", (w) => w.sint32(-2147483648), "ffffffff0f"],
    ["int64 2^32 - 1 as number", (w) => w.int64(2 ** 32 - 1), "ffffffff0f"],
    ["int64 2^32 as number", (w) => w.int64(2 ** 32), "8080808010"],
    ["int64 -1 as number", (w) => w.int64(-1), "ffffffffffffffffff01"],
    ["int64 -1 as string", (w) => w.int64("-1"), "ffffffffffffffffff01"],
    ["int64 -2^32 - 0.5, truncated", (w) => w.int64(-(2 ** 32) - 0.5), "80808080f0ffffffff01"],
    ["uint64 max", (w) => w.uint64(2n ** 64n - 1n), "ffffffffffffffffff01"],
    ["sint64 -2^63", (w) => w.sint64(-(2n ** 63n)), "ffffffffffffffffff01"],
    ["bool true", (w) => w.bool(true), "01"],
    ["fixed32 max", (w) => w.fixed32(4294967295), "ffffffff"],
    ["sfixed32 -2", (w) => w.sfixed32(-2), "feffffff"],
    ["fixed64 max as string", (w) => w.fixed64("18446744073709551615"), "ffffffffffffffff"],
    ["sfixed64 -2n", (w) => w.sfixed64(-2n), "feffffffffffffff"],
    ["float 1", (w) => w.float(1), "0000803f"],
    ["double 1", (w) => w.double(1), "000000000000f03f"],
    ["bytes", (w) => w.bytes(new Uint8Array([1, 2])), "020102"],
    ["raw bytes, without a length", (w) => w.raw(new Uint8Array([1, 2])), "0102"],
    // Two-, three- and four-byte characters, then lone surrogates as U+FFFD
    ["string", (w) => w.string("é日😀\uDC00\uD800a"), "10c3a9e697a5f09f9880efbfbdefbfbd61"],
    ["string longer than the buffer", (w) => w.string("é".repeat(1000)), "d00f" + "c3a9".repeat(1000)]
  ])("writes %s", (_, f, hex) => {
    assert.strictEqual(write(f), hex)
  })

  it("nests forks, growing the buffer and widening length prefixes", () => {
    const { Len, Varint } = ProtobufWriter.WireType
    const hex = write((w) => {
      w.tag(1, Len).fork()
      w.tag(1, Len).fork().tag(1, Len).bytes(new Uint8Array(2000)).join()
      w.join()
      w.tag(2, Varint).uint32(7)
    })
    assert.strictEqual(hex, "0ad60f0ad30f0ad00f" + "00".repeat(2000) + "1007")
  })

  it("throws for a join without a fork, and a finish without a join", () => {
    assert.throws(() => ProtobufWriter.make().join(), /join without a fork/)
    assert.throws(() => ProtobufWriter.make().tag(1, ProtobufWriter.WireType.Len).fork().finish(), /not joined/)
  })

  it("keeps writers apart and starts over after finish", () => {
    const a = ProtobufWriter.make().uint32(1)
    const b = ProtobufWriter.make().uint32(2)
    assert.strictEqual(Hex.encode(a.finish()), "01")
    const c = ProtobufWriter.make().uint32(3)
    assert.strictEqual(Hex.encode(b.finish()), "02")
    a.uint32(4)
    assert.strictEqual(Hex.encode(c.finish()), "03")
    assert.strictEqual(Hex.encode(a.finish()), "04")
  })
})
