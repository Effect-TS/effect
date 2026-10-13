/**
 * Node-compatible additions to Effect's cryptographic services.
 *
 * The `effect/crypto` modules implement most algorithms with Web Crypto; this
 * module runs them on `node:crypto`, which also works on Node.js 18, where
 * there is no `globalThis.crypto`, and adds what Web Crypto lacks: MD5,
 * ChaCha20-Poly1305, XChaCha20-Poly1305, and Argon2id. The {@link layer}
 * aggregate provides every service except Argon2id, which requires Node.js
 * 24.7 or later and is provided separately by {@link layerArgon2id}.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as Aes from "effect/crypto/Aes"
import * as Argon2 from "effect/crypto/Argon2"
import * as ChaCha20Poly1305 from "effect/crypto/ChaCha20Poly1305"
import * as CryptoError from "effect/crypto/CryptoError"
import * as Ecdh from "effect/crypto/Ecdh"
import * as Ecdsa from "effect/crypto/Ecdsa"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as Hkdf from "effect/crypto/Hkdf"
import * as Hmac from "effect/crypto/Hmac"
import * as Md5 from "effect/crypto/Md5"
import * as Pbkdf2 from "effect/crypto/Pbkdf2"
import * as Rsa from "effect/crypto/Rsa"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Sha1 from "effect/crypto/Sha1"
import * as Sha2 from "effect/crypto/Sha2"
import * as WebCrypto from "effect/crypto/WebCrypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as NodeCrypto from "node:crypto"
import * as Chacha from "./internal/chacha.ts"

/**
 * Layer that sets the `WebCrypto.SubtleCrypto` reference to `webcrypto.subtle`
 * from `node:crypto`.
 *
 * **When to use**
 *
 * Use to run the Web Crypto layers of `effect/crypto` on Node.js 18, which has
 * no `globalThis.crypto`. {@link layer} and the cluster layers include it.
 *
 * **Gotchas**
 *
 * Key conversions such as `Ed25519.publicKeyFromJwk` read the reference where
 * they run, not through a service layer. Provide this layer to the whole
 * program, or merge it with `Layer.provideMerge`; `Layer.provide` reaches only
 * the layers it is provided to.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSubtleCrypto: Layer.Layer<never> = Layer.succeed(
  WebCrypto.SubtleCrypto,
  NodeCrypto.webcrypto.subtle as SubtleCrypto
)

/**
 * Layer that provides `SecureRandom` using `randomFillSync` from `node:crypto`.
 *
 * **When to use**
 *
 * Use to replace `SecureRandom.layer` on Node.js 18, which has no
 * `globalThis.crypto`. {@link layer} includes it.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSecureRandom: Layer.Layer<SecureRandom.SecureRandom> = Layer.succeed(
  SecureRandom.SecureRandom,
  SecureRandom.make((size) => NodeCrypto.randomFillSync(new Uint8Array(size)))
)

/**
 * Layer that provides `Md5.Md5` using `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerMd5: Layer.Layer<Md5.Md5> = Layer.succeed(Md5.Md5, {
  digest: (data) =>
    Effect.try({
      try: () => Uint8Array.from(NodeCrypto.createHash("md5").update(data).digest()),
      catch: (cause) =>
        new CryptoError.CryptoError({
          algorithm: "MD5",
          method: "digest",
          reason: new CryptoError.Unknown({ description: "Could not compute digest", cause })
        })
    })
})

/**
 * Layer that provides `ChaCha20Poly1305.ChaCha20Poly1305` using `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerChaCha20Poly1305: Layer.Layer<ChaCha20Poly1305.ChaCha20Poly1305> = Layer.sync(
  ChaCha20Poly1305.ChaCha20Poly1305,
  Chacha.makeChaCha20Poly1305
)

/**
 * Layer that provides `ChaCha20Poly1305.XChaCha20Poly1305` using `node:crypto`.
 *
 * **Details**
 *
 * HChaCha20 derives each message subkey in JavaScript, and `node:crypto`
 * performs ChaCha20-Poly1305 encryption and authentication.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerXChaCha20Poly1305: Layer.Layer<ChaCha20Poly1305.XChaCha20Poly1305> = Layer.sync(
  ChaCha20Poly1305.XChaCha20Poly1305,
  Chacha.makeXChaCha20Poly1305
)

const argon2Failure = (method: string, cause: unknown): CryptoError.CryptoError => {
  const unsupported = typeof cause === "object" && cause !== null &&
    "code" in cause && cause.code === "ERR_CRYPTO_ARGON2_NOT_SUPPORTED"
  return new CryptoError.CryptoError({
    algorithm: "Argon2id",
    method,
    reason: unsupported
      ? new CryptoError.Unsupported({ description: "Argon2id is not supported by this runtime", cause })
      : new CryptoError.Unknown({ description: "Could not derive an Argon2id key", cause })
  })
}

const isIntegerIn = (n: number, min: number, max: number): boolean => Number.isSafeInteger(n) && n >= min && n <= max

const validArgon2Parameters = (options: Omit<Argon2.Options, "length">): boolean => {
  const uint32 = (n: number) => isIntegerIn(n, 1, 0xffff_ffff)
  return uint32(options.memoryKiB) && uint32(options.passes) && isIntegerIn(options.parallelism, 1, 0xff_ffff) &&
    options.memoryKiB >= 8 * options.parallelism && options.salt.length >= 8
}

const validArgon2Length = (length: number): boolean => isIntegerIn(length, 4, 0xffff_ffff)

const argon2id = (method: string, options: Argon2.Options) =>
  Effect.callback<Uint8Array, CryptoError.CryptoError>((resume) => {
    if (!validArgon2Parameters(options) || !validArgon2Length(options.length)) {
      return resume(Effect.fail(
        new CryptoError.CryptoError({
          algorithm: "Argon2id",
          method,
          reason: new CryptoError.BadArgument({
            description: "invalid Argon2id memory, passes, parallelism, output length, or salt"
          })
        })
      ))
    }
    try {
      NodeCrypto.argon2("argon2id", {
        message: Redacted.value(options.password),
        nonce: options.salt,
        memory: options.memoryKiB,
        passes: options.passes,
        parallelism: options.parallelism,
        tagLength: options.length,
        ...(options.secret === undefined ? {} : { secret: Redacted.value(options.secret) }),
        ...(options.associatedData === undefined ? {} : { associatedData: options.associatedData })
      }, (cause, key) => {
        if (cause) resume(Effect.fail(argon2Failure(method, cause)))
        else resume(Effect.succeed(new Uint8Array(key.buffer, key.byteOffset, key.length)))
      })
    } catch (cause) {
      resume(Effect.fail(argon2Failure(method, cause)))
    }
  }).pipe(Effect.uninterruptible)

/**
 * Layer that provides `Argon2.Argon2id` using native `node:crypto`
 * Argon2id.
 *
 * **Details**
 *
 * The layer fails to build with an `Unsupported` reason on runtimes without
 * `argon2` in `node:crypto`, such as Node.js before 24.7. Runtimes that provide
 * the function without engine support fail each operation with an
 * `Unsupported` reason instead.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerArgon2id: Layer.Layer<Argon2.Argon2id, CryptoError.CryptoError> = Layer.effect(
  Argon2.Argon2id,
  Effect.suspend(() =>
    typeof NodeCrypto.argon2 === "function"
      ? Effect.succeed(Argon2.Argon2id.of({
        derive: (options) => Effect.map(argon2id("derive", options), (bytes) => Redacted.make(bytes)),
        verify: ({ expected, ...options }) =>
          Effect.suspend(() => {
            if (validArgon2Parameters(options) && !validArgon2Length(expected.length)) return Effect.succeed(false)
            return Effect.map(argon2id("verify", { ...options, length: expected.length }), (actual) => {
              const equal = NodeCrypto.timingSafeEqual(actual, expected)
              actual.fill(0)
              return equal
            })
          })
      }))
      : Effect.fail(
        new CryptoError.CryptoError({
          algorithm: "Argon2id",
          method: "layer",
          reason: new CryptoError.Unsupported({ description: "Argon2id is not supported by this runtime" })
        })
      )
  )
)

/**
 * Union of the services provided by {@link layer}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type NodeCryptoServices =
  | SecureRandom.SecureRandom
  | Md5.Md5
  | Sha1.Sha1
  | Sha2.Sha2
  | Hmac.Hmac
  | Aes.Aes
  | ChaCha20Poly1305.ChaCha20Poly1305
  | ChaCha20Poly1305.XChaCha20Poly1305
  | Hkdf.Hkdf
  | Pbkdf2.Pbkdf2
  | Ed25519.Ed25519
  | Ecdsa.Ecdsa
  | Rsa.Rsa
  | Ecdh.Ecdh

/**
 * Layer that provides every Node.js cryptographic service except Argon2id.
 *
 * **When to use**
 *
 * Use when a Node.js program needs several algorithms. Provide individual
 * layers to include only the algorithms a program uses, and add
 * {@link layerArgon2id} for Argon2id.
 *
 * **Details**
 *
 * Includes {@link layerSubtleCrypto}, so key conversions such as
 * `Ed25519.publicKeyFromJwk` also reach Web Crypto on Node.js 18.
 *
 * @stability unstable
 * @category layers
 * @since 1.0.0
 */
export const layer: Layer.Layer<NodeCryptoServices> = Layer.mergeAll(
  Sha1.layer,
  Sha2.layer,
  Hmac.layer,
  Aes.layer,
  Hkdf.layer,
  Pbkdf2.layer,
  Ed25519.layer,
  Ecdsa.layer,
  Rsa.layer,
  Ecdh.layer
).pipe(
  // `layerSubtleCrypto` always supplies Web Crypto, so the layers cannot fail.
  Layer.orDie,
  // Also exposes the reference, so key conversions reach Web Crypto on Node.js 18.
  Layer.provideMerge(layerSubtleCrypto),
  Layer.merge(Layer.mergeAll(layerSecureRandom, layerMd5, layerChaCha20Poly1305, layerXChaCha20Poly1305))
)
