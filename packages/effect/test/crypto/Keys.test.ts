import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"

const assertInvalid = (error: Crypto.CryptoError, method: string) => {
  assert.strictEqual(error.method, method)
  assert.strictEqual(error.reason._tag, "InvalidKey")
}

const point = (size: number, prefix = 4) => Uint8Array.of(prefix, ...new Uint8Array(2 * size))

describe("key constructors", () => {
  it.effect("check the encoding of raw public keys", () =>
    Effect.gen(function*() {
      yield* Crypto.ed25519PublicKey(new Uint8Array(32))
      yield* Crypto.ecdhPublicKey("X25519", new Uint8Array(32))
      assertInvalid(yield* Effect.flip(Crypto.ed25519PublicKey(new Uint8Array(31))), "ed25519PublicKey")
      assertInvalid(yield* Effect.flip(Crypto.ecdhPublicKey("X25519", new Uint8Array(33))), "ecdhPublicKey")
      for (const [curve, size] of [["P-256", 32], ["P-384", 48], ["P-521", 66]] as const) {
        yield* Crypto.ecdsaPublicKey(curve, point(size))
        yield* Crypto.ecdhPublicKey(curve, point(size))
        // Compressed points and points of another curve are rejected.
        assertInvalid(yield* Effect.flip(Crypto.ecdsaPublicKey(curve, point(size, 2))), "ecdsaPublicKey")
        assertInvalid(yield* Effect.flip(Crypto.ecdhPublicKey(curve, point(size + 1))), "ecdhPublicKey")
      }
    }))
})
