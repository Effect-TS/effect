import { assert, describe, it } from "@effect/vitest"
import { Encoding, Result } from "effect"

describe("Encoding", () => {
  it("keeps the legacy format-prefixed facade", () => {
    assert.strictEqual(Encoding.encodeBase64("hello"), "aGVsbG8=")
    assert.strictEqual(Result.getOrThrow(Encoding.decodeBase64String("aGVsbG8=")), "hello")
    assert.strictEqual(Encoding.encodeBase64Url("hello?"), "aGVsbG8_")
    assert.strictEqual(Result.getOrThrow(Encoding.decodeBase64UrlString("aGVsbG8_")), "hello?")
    assert.strictEqual(Encoding.encodeHex("hello"), "68656c6c6f")
    assert.strictEqual(Result.getOrThrow(Encoding.decodeHexString("68656c6c6f")), "hello")
    assert.match(Encoding.randomHex(16), /^[0-9a-f]{16}$/)

    const failure = Encoding.decodeHex("zz")
    assert.isTrue(Result.isFailure(failure))
    if (Result.isFailure(failure)) {
      assert.isTrue(Encoding.isEncodingError(failure.failure))
    }
  })
})
