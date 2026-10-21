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
