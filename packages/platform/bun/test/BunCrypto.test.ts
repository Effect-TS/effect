import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Digest from "effect/crypto/Digest"
import * as Effect from "effect/Effect"

describe("BunCrypto", () => {
  it.effect("re-exports the NodeCrypto layers", () =>
    Effect.gen(function*() {
      const digest = yield* Digest.Digest
      // RFC 1321 "abc" vector.
      assert.strictEqual(
        yield* digest.digestHex(Digest.md5, new TextEncoder().encode("abc")),
        "900150983cd24fb0d6963f7d28e17f72"
      )
    }).pipe(Effect.provide(BunCrypto.layerDigest)))
})
