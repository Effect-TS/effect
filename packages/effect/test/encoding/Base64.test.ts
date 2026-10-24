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

  describe("native toBase64", () => {
    const bytes = Uint8Array.from({ length: 132 }, (_, i) => (i * 151) & 0xff)
    // Offset views with lengths around the native (32) and byte-array (128) cutoffs.
    const views = [31, 32, 33, 34, 127, 128, 129, 130].map((length) => bytes.subarray(1, 1 + length))
    const reference = (view: Uint8Array) => btoa(String.fromCharCode(...view))

    // Replaces `Uint8Array.prototype.toBase64` (or removes it) while `body` runs.
    const withToBase64 = (toBase64: ((this: Uint8Array) => string) | undefined, body: () => void) => {
      const descriptor = Object.getOwnPropertyDescriptor(Uint8Array.prototype, "toBase64")
      Reflect.defineProperty(Uint8Array.prototype, "toBase64", { value: toBase64, configurable: true })
      try {
        body()
      } finally {
        if (descriptor === undefined) Reflect.deleteProperty(Uint8Array.prototype, "toBase64")
        else Reflect.defineProperty(Uint8Array.prototype, "toBase64", descriptor)
      }
    }

    // A stand-in for the native method that records its receivers.
    const spyToBase64 = () => {
      const receivers: Array<Uint8Array> = []
      const toBase64 = function(this: Uint8Array) {
        receivers.push(this)
        return reference(this)
      }
      return { receivers, toBase64 }
    }

    it("is used from 32 bytes", () => {
      const { receivers, toBase64 } = spyToBase64()
      withToBase64(toBase64, () => {
        for (const view of views) assert.strictEqual(Base64.encode(view), reference(view))
      })
      assert.deepStrictEqual(receivers.map((view) => view.length), [32, 33, 34, 127, 128, 129, 130])
    })

    it("is not required", () => {
      withToBase64(undefined, () => {
        for (const view of views) assert.strictEqual(Base64.encode(view), reference(view))
      })
    })

    it("is not read from the input itself", () => {
      const view = Object.assign(bytes.subarray(1, 35), { toBase64: () => "x" })
      for (const toBase64 of [spyToBase64().toBase64, undefined]) {
        withToBase64(toBase64, () => assert.strictEqual(Base64.encode(view), reference(view)))
      }
    })

    it("is not called with a detached buffer", () => {
      const detached = new Uint8Array(32)
      structuredClone(detached.buffer, { transfer: [detached.buffer] })
      const { receivers, toBase64 } = spyToBase64()
      withToBase64(toBase64, () => assert.strictEqual(Base64.encode(detached), ""))
      withToBase64(undefined, () => assert.strictEqual(Base64.encode(detached), ""))
      assert.deepStrictEqual(receivers, [])
    })
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
