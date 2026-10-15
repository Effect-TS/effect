import { assert, describe, it } from "@effect/vitest"
import type * as CryptoError from "effect/crypto/CryptoError"
import * as Ecdh from "effect/crypto/Ecdh"
import * as Ecdsa from "effect/crypto/Ecdsa"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as Rsa from "effect/crypto/Rsa"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

const assertReason = (
  error: CryptoError.CryptoError,
  method: string,
  reason: CryptoError.CryptoErrorReason["_tag"]
) => {
  assert.strictEqual(error._tag, "CryptoError")
  assert.strictEqual(error.method, method)
  assert.strictEqual(error.reason._tag, reason)
}

/**
 * Runs the tests every platform shares: the Web Crypto behaviour the
 * `effect/crypto` layers rely on.
 */
export const describeCrypto = (label: string) =>
  describe(label, () => {
    // The Web Crypto layers themselves are tested in `effect`. These check the
    // runtime behaviour those layers rely on.
    describe("Web Crypto behaviour the layers rely on", () => {
      it.effect("exports Ed25519 private keys in the PKCS8 form Ed25519.privateKeyToRaw reads", () =>
        Effect.gen(function*() {
          const { privateKey } = yield* (yield* Ed25519.Ed25519).generateKeyPair()
          assert.strictEqual(Redacted.value(privateKey).length, 48)
          const seed = yield* Ed25519.privateKeyToRaw(privateKey)
          assert.deepStrictEqual(yield* Ed25519.privateKeyFromRaw(seed), privateKey)
        }).pipe(Effect.provide(Ed25519.layer)))

      it.effect("derives public keys from the private key's JWK export", () =>
        Effect.gen(function*() {
          const ed25519 = yield* Ed25519.Ed25519
          const ecdsa = yield* Ecdsa.Ecdsa
          const rsa = yield* Rsa.Rsa
          const ecdh = yield* Ecdh.Ecdh
          const edPair = yield* ed25519.generateKeyPair()
          assert.deepStrictEqual(yield* Ed25519.publicKeyFromPrivateKey(edPair.privateKey), edPair.publicKey)
          const ecdsaPair = yield* ecdsa.generateKeyPair({ curve: "P-384" })
          assert.deepStrictEqual(
            yield* Ecdsa.publicKeyFromPrivateKey("P-384", ecdsaPair.privateKey),
            ecdsaPair.publicKey
          )
          const rsaPair = yield* rsa.generateKeyPair()
          assert.deepStrictEqual(yield* Rsa.publicKeyFromPrivateKey(rsaPair.privateKey), rsaPair.publicKey)
          for (const curve of ["X25519", "P-256"] as const) {
            const pair = yield* ecdh.generateKeyPair({ curve })
            assert.deepStrictEqual(yield* Ecdh.publicKeyFromPrivateKey(curve, pair.privateKey), pair.publicKey)
          }
        }).pipe(
          Effect.provide(Layer.mergeAll(Ed25519.layer, Ecdsa.layer, Rsa.layer, Ecdh.layer))
        ))

      it.effect("converts keys to and from JSON Web Keys", () =>
        Effect.gen(function*() {
          const ed25519 = yield* (yield* Ed25519.Ed25519).generateKeyPair()
          const edJwk = yield* Ed25519.publicKeyToJwk(ed25519.publicKey)
          assert.deepStrictEqual(yield* Ed25519.publicKeyFromJwk(edJwk), ed25519.publicKey)
          const ecdsa = yield* (yield* Ecdsa.Ecdsa).generateKeyPair({ curve: "P-256" })
          const ecJwk = yield* Ecdsa.publicKeyToJwk("P-256", ecdsa.publicKey)
          assert.deepStrictEqual(yield* Ecdsa.publicKeyFromJwk("P-256", ecJwk), ecdsa.publicKey)
        }).pipe(Effect.provide(Layer.mergeAll(Ed25519.layer, Ecdsa.layer))))

      it.effect("derives full-length P-521 shared secrets", () =>
        Effect.gen(function*() {
          const ecdh = yield* Ecdh.Ecdh
          const first = yield* ecdh.generateKeyPair({ curve: "P-521" })
          const second = yield* ecdh.generateKeyPair({ curve: "P-521" })
          const shared = yield* ecdh.deriveSharedSecret({
            curve: "P-521",
            privateKey: first.privateKey,
            publicKey: second.publicKey
          })
          // 66 bytes: the 521-bit coordinate padded to whole bytes.
          assert.strictEqual(Redacted.value(shared).length, 66)
          assert.deepStrictEqual(
            yield* ecdh.deriveSharedSecret({
              curve: "P-521",
              privateKey: second.privateKey,
              publicKey: first.publicKey
            }),
            shared
          )
        }).pipe(Effect.provide(Ecdh.layer)))

      it.effect("rejects a small-order X25519 peer key", () =>
        Effect.gen(function*() {
          const ecdh = yield* Ecdh.Ecdh
          const { privateKey } = yield* ecdh.generateKeyPair({ curve: "X25519" })
          // Some runtimes reject the point; others return zeros, which the layer rejects.
          const error = yield* Effect.flip(
            ecdh.deriveSharedSecret({
              curve: "X25519",
              privateKey,
              publicKey: yield* Ecdh.publicKeyFromRaw("X25519", new Uint8Array(32))
            })
          )
          assertReason(error, "deriveSharedSecret", "InvalidKey")
        }).pipe(Effect.provide(Ecdh.layer)))
    })
  })
