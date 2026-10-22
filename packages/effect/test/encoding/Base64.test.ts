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
    const bytes = Uint8Array.from({ length: 1030 }, (_, i) => (i * 151) & 0xff)

    for (const length of [1026, 1027, 1028]) {
      const view = bytes.subarray(1, 1 + length)
      const expected = Buffer.from(view).toString("base64")
      assert.strictEqual(Base64.encode(view), expected)
      // An own undefined `toBase64` selects the fallback for runtimes without it
      assert.strictEqual(Base64.encode(Object.defineProperty(view, "toBase64", { value: undefined })), expected)
    }
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
