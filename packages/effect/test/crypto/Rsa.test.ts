import { assert, describe, it } from "@effect/vitest"
import * as Rsa from "effect/crypto/Rsa"
import * as Effect from "effect/Effect"
import { assertReason, encode, privateJwk, unreachable } from "../utils/crypto.ts"

describe("Rsa", () => {
  it.effect("signs with RSA-PSS, salted with the hash length by default", () =>
    Effect.gen(function*() {
      const rsa = yield* Rsa.Rsa
      const { privateKey, publicKey } = yield* rsa.generateKeyPair()
      const data = encode("data")
      const signature = yield* rsa.signPss({ privateKey, hash: "SHA-256", data })
      assert.isTrue(yield* rsa.verifyPss({ publicKey, hash: "SHA-256", saltLength: 32, signature, data }))
      assert.isFalse(yield* rsa.verifyPss({ publicKey, hash: "SHA-256", saltLength: 0, signature, data }))
    }).pipe(Effect.provide(Rsa.layer)))

  it.effect("signs with RSASSA-PKCS1-v1_5 and encrypts with RSA-OAEP on the same key", () =>
    Effect.gen(function*() {
      const rsa = yield* Rsa.Rsa
      const { privateKey, publicKey } = yield* rsa.generateKeyPair()
      assert.strictEqual(yield* Rsa.modulusLength(publicKey), 2048)
      assert.deepStrictEqual(yield* Rsa.publicKeyFromPrivateKey(privateKey), publicKey)
      const data = encode("data")
      const signature = yield* rsa.signPkcs1v15({ privateKey, hash: "SHA-256", data })
      // PKCS #1 v1.5 signatures are deterministic.
      assert.deepStrictEqual(yield* rsa.signPkcs1v15({ privateKey, hash: "SHA-256", data }), signature)
      assert.isTrue(yield* rsa.verifyPkcs1v15({ publicKey, hash: "SHA-256", signature, data }))
      assert.isFalse(yield* rsa.verifyPkcs1v15({ publicKey, hash: "SHA-384", signature, data }))

      const label = encode("label")
      const ciphertext = yield* rsa.encryptOaep({ publicKey, hash: "SHA-256", data, label })
      assert.deepStrictEqual(yield* rsa.decryptOaep({ privateKey, hash: "SHA-256", data: ciphertext, label }), data)
      for (const options of [{ hash: "SHA-256", label: undefined }, { hash: "SHA-384", label }] as const) {
        assertReason(
          yield* Effect.flip(rsa.decryptOaep({ privateKey, data: ciphertext, ...options })),
          "AuthenticationFailed"
        )
      }
    }).pipe(Effect.provide(Rsa.layer)))

  it.effect("converts keys", () =>
    Effect.gen(function*() {
      const rsa = yield* Rsa.Rsa
      const { privateKey, publicKey } = yield* rsa.generateKeyPair({ modulusLength: 3072 })
      assert.strictEqual(yield* Rsa.modulusLength(publicKey), 3072)
      const jwk = yield* Rsa.publicKeyToJwk(publicKey)
      assert.deepStrictEqual(Object.keys(jwk).sort(), ["e", "kty", "n"])
      assert.deepStrictEqual(yield* Rsa.publicKeyFromJwk({ ...jwk, alg: "RSA-OAEP-256" }), publicKey)
      assert.deepStrictEqual(yield* Rsa.publicKeyFromSpki(publicKey), publicKey)
      const fromJwk = yield* Rsa.privateKeyFromJwk(
        yield* privateJwk(privateKey, { name: "RSA-PSS", hash: "SHA-256" })
      )
      assert.deepStrictEqual(yield* Rsa.publicKeyFromPrivateKey(fromJwk), publicKey)
      assert.deepStrictEqual(yield* Rsa.publicKeyFromPrivateKey(yield* Rsa.privateKeyFromPkcs8(privateKey)), publicKey)
      assertReason(yield* Effect.flip(Rsa.publicKeyFromSpki(new Uint8Array(16))), "InvalidKey")
    }).pipe(Effect.provide(Rsa.layer)))

  it.effect("rejects plaintext longer than one RSA-OAEP block", () =>
    Effect.gen(function*() {
      const rsa = yield* Rsa.Rsa
      const { publicKey } = yield* rsa.generateKeyPair()
      // 2048-bit modulus with SHA-256: at most 256 - 2 * 32 - 2 = 190 bytes.
      assert.strictEqual(
        (yield* rsa.encryptOaep({ publicKey, hash: "SHA-256", data: new Uint8Array(190) })).length,
        256
      )
      assertReason(
        yield* Effect.flip(rsa.encryptOaep({ publicKey, hash: "SHA-256", data: new Uint8Array(191) })),
        "BadArgument",
        "encryptOaep"
      )
    }).pipe(Effect.provide(Rsa.layer)))

  it.effect("rejects a public JWK as a private key", () =>
    Effect.gen(function*() {
      assertReason(
        yield* Effect.flip(Rsa.privateKeyFromJwk({ kty: "RSA", n: "AAAA", e: "AQAB" })),
        "InvalidKey",
        "privateKeyFromJwk"
      )
    }).pipe(Effect.provide(unreachable)))
})
