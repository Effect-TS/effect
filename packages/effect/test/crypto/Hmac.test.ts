import { assert, describe, it } from "@effect/vitest"
import * as Hmac from "effect/crypto/Hmac"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import { assertReason, encode } from "../utils/crypto.ts"

describe("Hmac", () => {
  it.effect("computes and verifies tags with the requested hash", () =>
    Effect.gen(function*() {
      const hmac = yield* Hmac.Hmac
      const key = yield* hmac.generateKey({ hash: "SHA-512" })
      // Generated keys have the hash's block size.
      assert.strictEqual(Redacted.value(key).length, 128)
      const data = encode("data")
      const tag = yield* hmac.compute({ hash: "SHA-512", key, data })
      assert.strictEqual(tag.length, 64)
      assert.isTrue(yield* hmac.verify({ hash: "SHA-512", key, data, tag }))
      assert.isFalse(yield* hmac.verify({ hash: "SHA-256", key, data, tag }))
      assert.isFalse(yield* hmac.verify({ hash: "SHA-512", key, data, tag: tag.subarray(0, 32) }))
      const empty = yield* Effect.flip(hmac.compute({ hash: "SHA-256", key: Redacted.make(new Uint8Array()), data }))
      assertReason(empty, "InvalidKey")
    }).pipe(Effect.provide(Hmac.layer)))

  it.effect("reads keys of any length from JWK, checking an alg", () =>
    Effect.gen(function*() {
      const jwk = { kty: "oct", k: Base64Url.encode(new Uint8Array(20)) }
      assert.strictEqual(Redacted.value(yield* Hmac.keyFromJwk(jwk)).length, 20)
      for (const alg of ["HS1", "HS256", "HS384", "HS512"]) {
        assert.strictEqual(Redacted.value(yield* Hmac.keyFromJwk({ ...jwk, alg })).length, 20)
      }
      for (const alg of ["A256GCM", "RS256"]) {
        assertReason(yield* Effect.flip(Hmac.keyFromJwk({ ...jwk, alg })), "InvalidKey", "keyFromJwk")
      }
    }))
})
