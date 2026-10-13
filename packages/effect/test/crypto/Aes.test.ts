import { assert, describe, it } from "@effect/vitest"
import * as Aes from "effect/crypto/Aes"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { assertReason, encode, unreachable } from "../utils/crypto.ts"

describe("Aes", () => {
  it.effect("encrypts with AES-GCM and a 128-bit tag", () =>
    Effect.gen(function*() {
      const aes = yield* Aes.Aes
      const options = { key: yield* aes.generateKey(), nonce: new Uint8Array(12), additionalData: encode("ad") }
      const data = encode("secret")
      const sealed = yield* aes.encryptGcm({ ...options, data })
      assert.strictEqual(sealed.length, data.length + 16)
      assert.deepStrictEqual(yield* aes.decryptGcm({ ...options, data: sealed }), data)
      const error = yield* Effect.flip(aes.decryptGcm({ ...options, additionalData: encode("other"), data: sealed }))
      assertReason(error, "AuthenticationFailed")
      assert.strictEqual(Redacted.value(yield* aes.generateKey({ length: 128 })).length, 16)
      const short = yield* Effect.flip(aes.encryptGcm({ ...options, key: Redacted.make(new Uint8Array(15)), data }))
      assertReason(short, "InvalidKey")
    }).pipe(Effect.provide(Aes.layer)))

  // Web Crypto reports other lengths with the `OperationError` that also
  // signals a tag mismatch.
  it.effect("checks the AES-GCM nonce length before calling Web Crypto", () =>
    Effect.gen(function*() {
      const aes = yield* Aes.Aes
      const key = Redacted.make(new Uint8Array(16))
      for (const nonce of [new Uint8Array(0), new Uint8Array(8), new Uint8Array(24)]) {
        const data = new Uint8Array(32)
        assertReason(yield* Effect.flip(aes.encryptGcm({ key, nonce, data })), "BadArgument", "encryptGcm")
        assertReason(yield* Effect.flip(aes.decryptGcm({ key, nonce, data })), "BadArgument", "decryptGcm")
      }
    }).pipe(Effect.provide(Aes.layer.pipe(Layer.provide(unreachable)))))

  it.effect("encrypts with AES-CTR, letting the counter wrap", () =>
    Effect.gen(function*() {
      const aes = yield* Aes.Aes
      const options = { key: yield* aes.generateKey(), counter: new Uint8Array(16), counterLength: 64 }
      const data = encode("unauthenticated")
      const ciphertext = yield* aes.encryptCtr({ ...options, data })
      assert.strictEqual(ciphertext.length, data.length)
      assert.deepStrictEqual(yield* aes.decryptCtr({ ...options, data: ciphertext }), data)
      // A counter may wrap as long as no counter block repeats.
      const wrapping = { ...options, counter: new Uint8Array(16).fill(0xff), counterLength: 1 }
      const blocks = new Uint8Array(32)
      assert.deepStrictEqual(
        yield* aes.decryptCtr({ ...wrapping, data: yield* aes.encryptCtr({ ...wrapping, data: blocks }) }),
        blocks
      )
    }).pipe(Effect.provide(Aes.layer)))

  it.effect("reads keys from JWK and checks their length", () =>
    Effect.gen(function*() {
      const jwk = { kty: "oct", k: Base64Url.encode(new Uint8Array(32).fill(7)) }
      assert.deepStrictEqual(Redacted.value(yield* Aes.keyFromJwk(jwk)), new Uint8Array(32).fill(7))
      const short = { kty: "oct", k: Base64Url.encode(new Uint8Array(20)) }
      assertReason(yield* Effect.flip(Aes.keyFromJwk(short)), "InvalidKey")
      // An `alg` must name AES-GCM or AES-CTR with the key's length.
      for (const alg of ["A256GCM", "A256CTR"]) {
        assert.deepStrictEqual(Redacted.value(yield* Aes.keyFromJwk({ ...jwk, alg })), new Uint8Array(32).fill(7))
      }
      for (const alg of ["A128GCM", "A256KW", "HS256"]) {
        assertReason(yield* Effect.flip(Aes.keyFromJwk({ ...jwk, alg })), "InvalidKey", "keyFromJwk")
      }
    }))
})
