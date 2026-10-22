import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Base64 from "effect/encoding/Base64"

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
    const views = [31, 32, 33, 34].map((length) => bytes.subarray(1, 1 + length))
    const detached = new Uint8Array(32)
    structuredClone(detached.buffer, { transfer: [detached.buffer] })
    const reference = (view: Uint8Array) => btoa(String.fromCharCode(...view))
    const receivers: Array<unknown> = []
    const nativeToBase64 = function(this: Uint8Array) {
      receivers.push(this)
      return reference(this)
    }
    const descriptor = Object.getOwnPropertyDescriptor(Uint8Array.prototype, "toBase64")

    try {
      for (const toBase64 of [nativeToBase64, undefined]) {
        Reflect.defineProperty(Uint8Array.prototype, "toBase64", { value: toBase64, configurable: true })
        for (const view of views) {
          assert.strictEqual(Base64.encode(view), reference(view))
        }
        assert.strictEqual(
          Base64.encode(Object.assign(bytes.subarray(1, 35), { toBase64: () => "x" })),
          reference(views[3])
        )
        assert.strictEqual(Base64.encode(detached), "")
      }
    } finally {
      if (descriptor === undefined) Reflect.deleteProperty(Uint8Array.prototype, "toBase64")
      else Reflect.defineProperty(Uint8Array.prototype, "toBase64", descriptor)
    }
    assert.include(receivers, views[3])
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
