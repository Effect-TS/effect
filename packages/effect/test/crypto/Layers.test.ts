import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as Redacted from "effect/Redacted"

// The algorithms are Web Crypto's; these tests check that each layer passes it
// the right parameters and returns its results in the right shape.

const encode = (text: string): Uint8Array => new TextEncoder().encode(text)

describe("Web Crypto layers", () => {
  it.effect("Sha2 and Sha1: digest with the requested algorithm", () =>
    Effect.gen(function*() {
      const sha2 = yield* Crypto.Sha2
      const sha1 = yield* Crypto.Sha1
      assert.strictEqual(
        Hex.encode(yield* sha2.digest("SHA-256", encode("abc"))),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
      )
      assert.strictEqual((yield* sha2.digest("SHA-512", encode("abc"))).length, 64)
      assert.strictEqual(Hex.encode(yield* sha1.digest(encode("abc"))), "a9993e364706816aba3e25717850c26c9cd0d89d")
    }).pipe(Effect.provide(Crypto.layerSha2), Effect.provide(Crypto.layerSha1)))

  it.effect("Hmac: computes and verifies tags with the requested hash", () =>
    Effect.gen(function*() {
      const hmac = yield* Crypto.Hmac
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
      assert.strictEqual(empty.reason._tag, "InvalidKey")
    }).pipe(Effect.provide(Crypto.layerHmac)))

  it.effect("Aes: encrypts with AES-GCM and a 128-bit tag", () =>
    Effect.gen(function*() {
      const aes = yield* Crypto.Aes
      const options = { key: yield* aes.generateKey(), nonce: new Uint8Array(12), additionalData: encode("ad") }
      const data = encode("secret")
      const sealed = yield* aes.encryptGcm({ ...options, data })
      assert.strictEqual(sealed.length, data.length + 16)
      assert.deepStrictEqual(yield* aes.decryptGcm({ ...options, data: sealed }), data)
      const error = yield* Effect.flip(aes.decryptGcm({ ...options, additionalData: encode("other"), data: sealed }))
      assert.strictEqual(error.reason._tag, "AuthenticationFailed")
      assert.strictEqual(Redacted.value(yield* aes.generateKey({ length: 128 })).length, 16)
      const short = yield* Effect.flip(aes.encryptGcm({ ...options, key: Redacted.make(new Uint8Array(15)), data }))
      assert.strictEqual(short.reason._tag, "InvalidKey")
    }).pipe(Effect.provide(Crypto.layerAes)))

  it.effect("Aes: encrypts with AES-CTR", () =>
    Effect.gen(function*() {
      const aes = yield* Crypto.Aes
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
    }).pipe(Effect.provide(Crypto.layerAes)))

  it.effect("Hkdf and Pbkdf2: derive the requested length", () =>
    Effect.gen(function*() {
      const hkdf = yield* Crypto.Hkdf
      const pbkdf2 = yield* Crypto.Pbkdf2
      const derived = yield* hkdf.derive({ hash: "SHA-256", key: Redacted.make(new Uint8Array(32)), length: 42 })
      assert.strictEqual(Redacted.value(derived).length, 42)
      const options = { hash: "SHA-256", password: encode("password"), salt: encode("salt"), iterations: 2 } as const
      const expected = yield* pbkdf2.derive({ ...options, length: 20 })
      assert.strictEqual(expected.length, 20)
      assert.isTrue(yield* pbkdf2.verify({ ...options, expected }))
      assert.isFalse(yield* pbkdf2.verify({ ...options, password: encode("wrong"), expected }))
    }).pipe(Effect.provide(Crypto.layerHkdf), Effect.provide(Crypto.layerPbkdf2)))

  it.effect("Ed25519: signs and verifies", () =>
    Effect.gen(function*() {
      const ed25519 = yield* Crypto.Ed25519
      const { privateKey, publicKey } = yield* ed25519.generateKeyPair()
      const data = encode("data")
      const signature = yield* ed25519.sign({ privateKey, data })
      assert.strictEqual(signature.length, 64)
      assert.isTrue(yield* ed25519.verify({ publicKey, signature, data }))
      assert.isFalse(yield* ed25519.verify({ publicKey, signature, data: encode("other") }))
    }).pipe(Effect.provide(Crypto.layerEd25519)))

  it.effect("Ecdsa: signs in the fixed-width P1363 encoding", () =>
    Effect.gen(function*() {
      const ecdsa = yield* Crypto.Ecdsa
      const data = encode("data")
      for (const [curve, length] of [["P-256", 64], ["P-384", 96], ["P-521", 132]] as const) {
        const { privateKey, publicKey } = yield* ecdsa.generateKeyPair({ curve })
        const signature = yield* ecdsa.sign({ curve, privateKey, hash: "SHA-256", data })
        assert.strictEqual(signature.length, length)
        assert.isTrue(yield* ecdsa.verify({ curve, publicKey, hash: "SHA-256", signature, data }))
        assert.isFalse(yield* ecdsa.verify({ curve, publicKey, hash: "SHA-384", signature, data }))
      }
      // A key on another curve is rejected when it is imported.
      const p256 = yield* ecdsa.generateKeyPair({ curve: "P-256" })
      const error = yield* Effect.flip(
        ecdsa.sign({ curve: "P-384", privateKey: p256.privateKey, hash: "SHA-256", data })
      )
      assert.strictEqual(error.reason._tag, "InvalidKey")
    }).pipe(Effect.provide(Crypto.layerEcdsa)))

  it.effect("Rsa: signs with RSA-PSS, salted with the hash length by default", () =>
    Effect.gen(function*() {
      const rsa = yield* Crypto.Rsa
      const { privateKey, publicKey } = yield* rsa.generateKeyPair()
      const data = encode("data")
      const signature = yield* rsa.signPss({ privateKey, hash: "SHA-256", data })
      assert.isTrue(yield* rsa.verifyPss({ publicKey, hash: "SHA-256", saltLength: 32, signature, data }))
      assert.isFalse(yield* rsa.verifyPss({ publicKey, hash: "SHA-256", saltLength: 0, signature, data }))
    }).pipe(Effect.provide(Crypto.layerRsa)))

  it.effect("Rsa: signs with RSASSA-PKCS1-v1_5 and encrypts with RSA-OAEP on the same key", () =>
    Effect.gen(function*() {
      const rsa = yield* Crypto.Rsa
      const { privateKey, publicKey } = yield* rsa.generateKeyPair()
      assert.strictEqual(yield* rsa.modulusLength(publicKey), 2048)
      assert.deepStrictEqual(yield* rsa.publicKey(privateKey), publicKey)
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
        const error = yield* Effect.flip(rsa.decryptOaep({ privateKey, data: ciphertext, ...options }))
        assert.strictEqual(error.reason._tag, "AuthenticationFailed")
      }
    }).pipe(Effect.provide(Crypto.layerRsa)))

  it.effect("Ecdh: derives the same secret on both sides, with the curve's length", () =>
    Effect.gen(function*() {
      const ecdh = yield* Crypto.Ecdh
      for (const [curve, length] of [["X25519", 32], ["P-256", 32], ["P-384", 48], ["P-521", 66]] as const) {
        const first = yield* ecdh.generateKeyPair({ curve })
        const second = yield* ecdh.generateKeyPair({ curve })
        const shared = yield* ecdh.deriveSharedSecret({
          curve,
          privateKey: first.privateKey,
          publicKey: second.publicKey
        })
        assert.strictEqual(Redacted.value(shared).length, length)
        assert.deepStrictEqual(
          yield* ecdh.deriveSharedSecret({ curve, privateKey: second.privateKey, publicKey: first.publicKey }),
          shared
        )
      }
    }).pipe(Effect.provide(Crypto.layerEcdh)))
})
