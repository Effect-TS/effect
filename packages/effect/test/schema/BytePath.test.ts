import { assert, describe, it } from "@effect/vitest"
import { BytePath, Equal, Result, Schema } from "effect"

const path = (bytes: Uint8Array) => Result.getOrThrow(BytePath.fromBytes(bytes))
const failure = <A, E>(result: Result.Result<A, E>): E => Result.getOrThrow(Result.flip(result))

describe("BytePath schemas", () => {
  it("should accept constructed values when validating the declaration schema", () => {
    const value = path(new Uint8Array([255]))
    assert.strictEqual(Schema.decodeUnknownSync(Schema.BytePath)(value), value)
    assert.strictEqual(Schema.encodeSync(Schema.BytePath)(value), value)
    assert.isTrue(Result.isFailure(Schema.decodeUnknownResult(Schema.BytePath)(new Uint8Array([255]))))
    assert.isTrue(Result.isFailure(Schema.encodeUnknownResult(Schema.BytePathFromBytes)({})))
  })

  it("should preserve ownership when callers mutate decoded input or encoded output", () => {
    const input = new Uint8Array([47, 255])
    const value = Schema.decodeUnknownSync(Schema.BytePathFromBytes)(input)
    input.fill(0)
    const encoded = Schema.encodeSync(Schema.BytePathFromBytes)(value)
    assert.deepStrictEqual(encoded, new Uint8Array([47, 255]))
    encoded.fill(0)
    assert.deepStrictEqual(Schema.encodeSync(Schema.BytePathFromBytes)(value), new Uint8Array([47, 255]))
  })

  it("should report useful Schema diagnostics when byte construction fails", () => {
    const detached = new Uint8Array(0)
    structuredClone(detached.buffer, { transfer: [detached.buffer] })
    const buffer = new ArrayBuffer(4, { maxByteLength: 8 })
    const outOfBounds = new Uint8Array(buffer, 2, 2)
    buffer.resize(1)
    const shared = new Uint8Array(new SharedArrayBuffer(1)).fill(1)
    Object.defineProperty(shared, "buffer", { value: new ArrayBuffer(1) })
    for (
      const [input, message] of [
        [new Uint8Array([0]), "NUL"],
        [shared, "SharedArrayBuffer"],
        [detached, "detached"],
        [outOfBounds, "out of bounds"]
      ] as const
    ) {
      const result = Schema.decodeUnknownResult(Schema.BytePathFromBytes)(input)
      assert.include(String(failure(result)), message)
    }
  })

  it("should round-trip bytes through Base64 when deriving JSON codecs", () => {
    for (const schema of [Schema.BytePath, Schema.BytePathFromBytes]) {
      const json = Schema.toCodecJson(schema)
      for (const [input, encoded] of [[[], ""], [[255], "/w=="]] as const) {
        const value = path(new Uint8Array(input))
        assert.strictEqual(Schema.encodeSync(json)(value), encoded)
        assert.isTrue(Equal.equals(Schema.decodeUnknownSync(json)(encoded), value))
      }
      assert.isTrue(Result.isFailure(Schema.decodeUnknownResult(json)("AA==")))
    }
  })
})
