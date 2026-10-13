import { assert, describe, it } from "@effect/vitest"
import * as Aes from "effect/crypto/Aes"
import * as Ecdh from "effect/crypto/Ecdh"
import * as Rsa from "effect/crypto/Rsa"
import * as Sha2 from "effect/crypto/Sha2"
import * as WebCrypto from "effect/crypto/WebCrypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { assertReason, fakeSubtle, raise } from "../utils/crypto.ts"

describe("WebCrypto", () => {
  it("maps Web Crypto exceptions to reasons", () => {
    for (
      const [name, reason] of [
        ["DataError", "InvalidKey"],
        ["NotSupportedError", "Unsupported"],
        ["InvalidAccessError", "BadArgument"],
        ["SyntaxError", "BadArgument"],
        ["TypeError", "BadArgument"],
        ["OperationError", "Unknown"]
      ] as const
    ) {
      const cause = Object.assign(new Error(name), { name })
      const error = WebCrypto.webCryptoError("AES-GCM", "encrypt", cause)
      assert.strictEqual(error.algorithm, "AES-GCM")
      assertReason(error, reason, "encrypt")
      assert.strictEqual(error.reason.cause, cause)
    }
    assertReason(WebCrypto.webCryptoError("SHA-256", "digest", "not an error"), "Unknown")
    assert.isTrue(WebCrypto.isOperationError(Object.assign(new Error(), { name: "OperationError" })))
    assert.isFalse(WebCrypto.isOperationError(new Error()))
  })

  it.effect("fails to build the layers when there is no SubtleCrypto", () =>
    Effect.gen(function*() {
      const missing = Layer.succeed(WebCrypto.SubtleCrypto, undefined)
      const error = yield* Effect.flip(Layer.build(Aes.layer.pipe(Layer.provide(missing))))
      assert.strictEqual(error.algorithm, "WebCrypto")
      assertReason(error, "Unsupported", "subtle")
    }))

  it.effect("runs the layers on the provided SubtleCrypto", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* (yield* Sha2.Sha2).digest("SHA-256", new Uint8Array()), Uint8Array.of(1, 2, 3))
    }).pipe(
      Effect.provide(
        Sha2.layer.pipe(
          Layer.provide(fakeSubtle({ digest: () => Promise.resolve(Uint8Array.of(1, 2, 3).buffer) }))
        )
      )
    ))

  it.effect("reports an OperationError from decryption as AuthenticationFailed", () =>
    Effect.gen(function*() {
      const aes = yield* Aes.Aes
      const rsa = yield* Rsa.Rsa
      const key = Redacted.make(new Uint8Array(16))
      const nonce = new Uint8Array(12)
      const data = new Uint8Array(32)
      assertReason(yield* Effect.flip(aes.decryptGcm({ key, nonce, data })), "AuthenticationFailed", "decryptGcm")
      // It means something else when encrypting.
      assertReason(yield* Effect.flip(aes.encryptGcm({ key, nonce, data })), "Unknown", "encryptGcm")
      const privateKey = Redacted.make(new Uint8Array(8)) as Rsa.PrivateKey
      assertReason(
        yield* Effect.flip(rsa.decryptOaep({ privateKey, hash: "SHA-256", data })),
        "AuthenticationFailed",
        "decryptOaep"
      )
      // RSA-OAEP encryption fails this way only for plaintext that is too long.
      assertReason(
        yield* Effect.flip(rsa.encryptOaep({ publicKey: new Uint8Array(8) as Rsa.PublicKey, hash: "SHA-256", data })),
        "BadArgument",
        "encryptOaep"
      )
    }).pipe(
      Effect.provide(
        Layer.mergeAll(Aes.layer, Rsa.layer).pipe(
          Layer.provide(fakeSubtle({ encrypt: raise("OperationError"), decrypt: raise("OperationError") }))
        )
      )
    ))

  it.effect("reports an OperationError from AES-CTR as BadArgument", () =>
    Effect.gen(function*() {
      const aes = yield* Aes.Aes
      const options = { key: Redacted.make(new Uint8Array(16)), counter: new Uint8Array(16), counterLength: 1 }
      const data = new Uint8Array(48)
      assertReason(yield* Effect.flip(aes.encryptCtr({ ...options, data })), "BadArgument", "encryptCtr")
      assertReason(yield* Effect.flip(aes.decryptCtr({ ...options, data })), "BadArgument", "decryptCtr")
    }).pipe(
      Effect.provide(
        Aes.layer.pipe(
          Layer.provide(fakeSubtle({ encrypt: raise("OperationError"), decrypt: raise("OperationError") }))
        )
      )
    ))

  // Chrome, for example, rejects 192-bit AES keys with an `OperationError`.
  it.effect("does not report an OperationError from a key import as a failed operation", () =>
    Effect.gen(function*() {
      const aes = yield* Aes.Aes
      const rsa = yield* Rsa.Rsa
      const ecdh = yield* Ecdh.Ecdh
      const key = Redacted.make(new Uint8Array(24))
      const data = new Uint8Array(32)
      assertReason(
        yield* Effect.flip(aes.decryptGcm({ key, nonce: new Uint8Array(12), data })),
        "Unknown",
        "decryptGcm"
      )
      assertReason(
        yield* Effect.flip(aes.encryptCtr({ key, counter: new Uint8Array(16), counterLength: 64, data })),
        "Unknown",
        "encryptCtr"
      )
      const rsaKey = Redacted.make(new Uint8Array(8)) as Rsa.PrivateKey
      assertReason(
        yield* Effect.flip(rsa.decryptOaep({ privateKey: rsaKey, hash: "SHA-256", data })),
        "Unknown",
        "decryptOaep"
      )
      assertReason(
        yield* Effect.flip(rsa.encryptOaep({ publicKey: new Uint8Array(8) as Rsa.PublicKey, hash: "SHA-256", data })),
        "Unknown",
        "encryptOaep"
      )
      const ecdhKey = Redacted.make(new Uint8Array(8)) as Ecdh.PrivateKey
      const publicKey = yield* Ecdh.publicKeyFromRaw("X25519", new Uint8Array(32))
      assertReason(
        yield* Effect.flip(ecdh.deriveSharedSecret({ curve: "X25519", privateKey: ecdhKey, publicKey })),
        "Unknown",
        "deriveSharedSecret"
      )
    }).pipe(
      Effect.provide(
        Layer.mergeAll(Aes.layer, Rsa.layer, Ecdh.layer).pipe(
          Layer.provide(fakeSubtle({ importKey: raise("OperationError") }))
        )
      )
    ))
})
