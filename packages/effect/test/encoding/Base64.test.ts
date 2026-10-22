import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Base64 from "effect/encoding/Base64"
import { Buffer } from "node:buffer"

describe("Base64", () => {
  it("encodes and decodes binary subarrays with and without padding", () => {
    const bytes = new Uint8Array([42, 251, 255, 128, 42])
    const vectors = ["", "+w==", "+/8=", "+/+A"]

    for (const [length, encoded] of vectors.entries()) {
      const view = bytes.subarray(1, 1 + length)
      assert.strictEqual(Base64.encode(view), encoded)
      assert.deepStrictEqual(Result.getOrThrow(Base64.decode(encoded)), view)
    }
    assert.deepStrictEqual(bytes, new Uint8Array([42, 251, 255, 128, 42]))
  })

  it("encodes views with and without native toBase64", () => {
    const bytes = Uint8Array.from({ length: 36 }, (_, i) => (i * 151) & 0xff)
    const proto = Uint8Array.prototype as { toBase64?: unknown }
    const native = Object.getOwnPropertyDescriptor(proto, "toBase64")

    for (const length of [31, 32, 33, 34]) {
      const view = bytes.subarray(1, 1 + length)
      const expected = Buffer.from(view).toString("base64")
      assert.strictEqual(Base64.encode(view), expected)
      // Without a native `toBase64`, as on runtimes that lack it, the fallback runs
      Object.defineProperty(proto, "toBase64", { value: undefined, configurable: true, writable: true })
      try {
        assert.strictEqual(Base64.encode(view), expected)
      } finally {
        if (native) Object.defineProperty(proto, "toBase64", native)
        else delete proto.toBase64
      }
    }
  })

  it("ignores a toBase64 on the input", () => {
    const bytes = Object.assign(new Uint8Array(32).fill(7), { toBase64: () => "x" })
    assert.strictEqual(Base64.encode(bytes), Buffer.from(bytes).toString("base64"))
  })

  it("encodes a detached buffer as an empty string", () => {
    const bytes = new Uint8Array([1, 2, 3])
    structuredClone(bytes.buffer, { transfer: [bytes.buffer] })
    assert.strictEqual(Base64.encode(bytes), "")
  })

  it("encodes strings and bytes", () => {
    assert.strictEqual(Base64.encode("hello"), "aGVsbG8=")
    assert.strictEqual(Base64.encode(new Uint8Array([72, 101, 108, 108, 111])), "SGVsbG8=")
  })

  it("decodes bytes and UTF-8 strings", () => {
    assert.deepStrictEqual(
      Result.getOrThrow(Base64.decode("SGVs\r\nbG8=")),
      new Uint8Array([72, 101, 108, 108, 111])
    )
    assert.strictEqual(Result.getOrThrow(Base64.decodeString("8J+Riw==")), "👋")
  })

  it("rejects invalid input with format information", () => {
    const invalidLength = Base64.decode("abc")
    assert.isTrue(Result.isFailure(invalidLength))
    if (Result.isFailure(invalidLength)) {
      assert.strictEqual(invalidLength.failure.kind, "Decode")
      assert.strictEqual(invalidLength.failure.module, "Base64")
      assert.strictEqual(invalidLength.failure.input, "abc")
    }

    assert.isTrue(Result.isFailure(Base64.decode("ab=c")))
    assert.isTrue(Result.isFailure(Base64.decode("!!!!")))
  })
})
