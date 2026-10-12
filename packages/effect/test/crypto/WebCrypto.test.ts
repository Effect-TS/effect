import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

// An exception as Web Crypto raises it, identified by its name.
const raise = (name: string) => () => Promise.reject(Object.assign(new Error(`${name} from fixture`), { name }))

// A `SubtleCrypto` whose key imports succeed and whose other methods are
// supplied by the test.
const fakeSubtle = (methods: Partial<Record<keyof SubtleCrypto, () => Promise<unknown>>>) =>
  Layer.succeed(
    Crypto.SubtleCrypto,
    { importKey: () => Promise.resolve({}), ...methods } as unknown as SubtleCrypto
  )

const assertFailure = (
  error: Crypto.CryptoError,
  expected: { readonly algorithm: string; readonly method: string; readonly reason: string }
) => {
  assert.strictEqual(error.algorithm, expected.algorithm)
  assert.strictEqual(error.method, expected.method)
  assert.strictEqual(error.reason._tag, expected.reason)
}

describe("WebCrypto", () => {
  it("maps Web Crypto exceptions to reasons", () => {
    for (
      const [name, reason] of [
        ["DataError", "InvalidKey"],
        ["NotSupportedError", "Unsupported"],
        ["InvalidAccessError", "BadArgument"],
        ["SyntaxError", "BadArgument"],
        ["OperationError", "Unknown"],
        ["TypeError", "BadArgument"]
      ] as const
    ) {
      const cause = Object.assign(new Error(name), { name })
      const error = Crypto.webCryptoError("AES-GCM", "encrypt", cause)
      assertFailure(error, { algorithm: "AES-GCM", method: "encrypt", reason })
      assert.strictEqual(error.reason.cause, cause)
    }
    assert.strictEqual(Crypto.webCryptoError("SHA-256", "digest", "not an error").reason._tag, "Unknown")
    assert.isTrue(Crypto.isOperationError(Object.assign(new Error(), { name: "OperationError" })))
    assert.isFalse(Crypto.isOperationError(new Error()))
  })

  it.effect("fails to build Web Crypto layers when there is no SubtleCrypto", () =>
    Effect.gen(function*() {
      const missing = Layer.succeed(Crypto.SubtleCrypto, undefined)
      const error = yield* Effect.flip(Layer.build(Crypto.layerAes.pipe(Layer.provide(missing))))
      assertFailure(error, { algorithm: "WebCrypto", method: "subtle", reason: "Unsupported" })
      assert.strictEqual(
        error.reason.description,
        "Web Crypto is unavailable; browsers expose crypto.subtle only in secure contexts"
      )
    }))

  it.effect("runs the layers on a provided SubtleCrypto", () =>
    Effect.gen(function*() {
      const digest = yield* (yield* Crypto.Sha2).digest("SHA-256", new Uint8Array())
      assert.deepStrictEqual(digest, Uint8Array.of(1, 2, 3))
    }).pipe(
      Effect.provide(
        Crypto.layerSha2.pipe(
          Layer.provide(fakeSubtle({ digest: () => Promise.resolve(Uint8Array.of(1, 2, 3).buffer) }))
        )
      )
    ))

  it.effect("reports a failed decryption as AuthenticationFailed", () =>
    Effect.gen(function*() {
      const aes = yield* Crypto.Aes
      const rsa = yield* Crypto.Rsa
      const key = Redacted.make(new Uint8Array(16))
      const nonce = new Uint8Array(12)
      const data = new Uint8Array(32)
      assertFailure(yield* Effect.flip(aes.decryptGcm({ key, nonce, data })), {
        algorithm: "AES-GCM",
        method: "decryptGcm",
        reason: "AuthenticationFailed"
      })
      // An `OperationError` means something else when encrypting.
      assertFailure(yield* Effect.flip(aes.encryptGcm({ key, nonce, data })), {
        algorithm: "AES-GCM",
        method: "encryptGcm",
        reason: "Unknown"
      })
      const privateKey = Redacted.make(new Uint8Array(8)) as Crypto.RsaPrivateKey
      assertFailure(yield* Effect.flip(rsa.decryptOaep({ privateKey, hash: "SHA-256", data })), {
        algorithm: "RSA-OAEP",
        method: "decryptOaep",
        reason: "AuthenticationFailed"
      })
    }).pipe(
      Effect.provide(
        Layer.mergeAll(Crypto.layerAes, Crypto.layerRsa).pipe(
          Layer.provide(fakeSubtle({ encrypt: raise("OperationError"), decrypt: raise("OperationError") }))
        )
      )
    ))

  it.effect("reports a rejected peer key as InvalidKey", () =>
    Effect.gen(function*() {
      const ecdh = yield* Crypto.Ecdh
      const privateKey = Redacted.make(new Uint8Array(8)) as Crypto.EcdhPrivateKey
      for (
        const [curve, bytes] of [
          ["X25519", new Uint8Array(32)],
          ["P-256", Uint8Array.of(4, ...new Uint8Array(64))]
        ] as const
      ) {
        const publicKey = yield* Crypto.ecdhPublicKey(curve, bytes)
        assertFailure(yield* Effect.flip(ecdh.deriveSharedSecret({ curve, privateKey, publicKey })), {
          algorithm: "ECDH",
          method: "deriveSharedSecret",
          reason: "InvalidKey"
        })
      }
    }).pipe(
      Effect.provide(Crypto.layerEcdh.pipe(Layer.provide(fakeSubtle({ deriveBits: raise("OperationError") }))))
    ))

  it.effect("rejects an all-zero X25519 shared secret", () =>
    Effect.gen(function*() {
      const ecdh = yield* Crypto.Ecdh
      const error = yield* Effect.flip(ecdh.deriveSharedSecret({
        curve: "X25519",
        privateKey: Redacted.make(new Uint8Array(48)) as Crypto.EcdhPrivateKey,
        publicKey: yield* Crypto.ecdhPublicKey("X25519", new Uint8Array(32))
      }))
      assertFailure(error, { algorithm: "ECDH", method: "deriveSharedSecret", reason: "InvalidKey" })
      assert.strictEqual(error.reason.description, "X25519 shared secret must not be all zeros")
    }).pipe(
      Effect.provide(
        Crypto.layerEcdh.pipe(Layer.provide(fakeSubtle({ deriveBits: () => Promise.resolve(new ArrayBuffer(32)) })))
      )
    ))

  it.effect("names errors after the public operation and keeps the cause", () =>
    Effect.gen(function*() {
      const ed25519 = yield* Crypto.Ed25519
      const error = yield* Effect.flip(ed25519.sign({
        privateKey: yield* Crypto.ed25519PrivateKeyFromRaw(new Uint8Array(32)),
        data: new Uint8Array()
      }))
      assertFailure(error, { algorithm: "Ed25519", method: "sign", reason: "InvalidKey" })
      assert.strictEqual((error.reason.cause as Error).name, "DataError")
    }).pipe(Effect.provide(Crypto.layerEd25519.pipe(Layer.provide(fakeSubtle({ importKey: raise("DataError") }))))))

  it.effect("recovers from authentication failures with catchReason", () =>
    Effect.gen(function*() {
      const aes = yield* Crypto.Aes
      const key = yield* aes.generateKey({ length: 128 })
      const nonce = new Uint8Array(12)
      const sealed = yield* aes.encryptGcm({ key, nonce, data: new Uint8Array(4) })
      sealed[0] ^= 1
      const result = yield* aes.decryptGcm({ key, nonce, data: sealed }).pipe(
        Effect.as("decrypted"),
        Effect.catchReason("CryptoError", "AuthenticationFailed", () => Effect.succeed("rejected"))
      )
      assert.strictEqual(result, "rejected")
    }).pipe(Effect.provide(Crypto.layerAes)))

  it("formats error messages with the algorithm, method, and reason", () => {
    const error = new Crypto.CryptoError({
      algorithm: "AES-GCM",
      method: "decrypt",
      reason: new Crypto.AuthenticationFailed({ description: "Could not authenticate or decrypt data" })
    })
    assert.strictEqual(error.message, "AES-GCM.decrypt: AuthenticationFailed: Could not authenticate or decrypt data")
    assert.isTrue(Crypto.isCryptoError(error))
    assert.strictEqual(error.cause, error.reason)
  })
})
