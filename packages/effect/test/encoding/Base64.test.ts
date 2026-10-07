import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Base64 from "effect/encoding/Base64"

describe("Base64", () => {
  it("matches the RFC 4648 test vectors", () => {
    const vectors = [
      ["", ""],
      ["f", "Zg=="],
      ["fo", "Zm8="],
      ["foo", "Zm9v"],
      ["foob", "Zm9vYg=="],
      ["fooba", "Zm9vYmE="],
      ["foobar", "Zm9vYmFy"]
    ] as const

    for (const [input, encoded] of vectors) {
      assert.strictEqual(Base64.encode(input), encoded)
      assert.deepStrictEqual(Result.getOrThrow(Base64.decode(encoded)), new TextEncoder().encode(input))
    }
  })

  it("preserves every byte value with and without padding", () => {
    for (const length of [256, 257, 258]) {
      const bytes = Uint8Array.from({ length }, (_, i) => i % 256)
      const encoded = btoa(String.fromCharCode(...bytes))

      assert.strictEqual(Base64.encode(bytes), encoded)
      assert.deepStrictEqual(Result.getOrThrow(Base64.decode(encoded)), bytes)
    }
  })

  it("encodes only the bytes in a subarray view", () => {
    const bytes = new Uint8Array([42, 0, 255, 128, 42])

    assert.strictEqual(Base64.encode(bytes.subarray(1, 4)), "AP+A")
    assert.strictEqual(Base64.encode(bytes.subarray(1, 3)), "AP8=")
    assert.strictEqual(Base64.encode(bytes.subarray(1, 2)), "AA==")
    assert.strictEqual(Base64.encode(bytes.subarray(1, 1)), "")
    assert.deepStrictEqual(bytes, new Uint8Array([42, 0, 255, 128, 42]))
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
