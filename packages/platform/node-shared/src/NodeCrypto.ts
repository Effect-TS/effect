/**
 * Node-compatible additions to Effect's cryptographic services.
 *
 * The `effect/crypto` modules implement most algorithms with Web Crypto; this
 * module runs them on `node:crypto`, which also works on Node.js 18, where
 * there is no `globalThis.crypto`, and adds what Web Crypto lacks: MD5,
 * ChaCha20-Poly1305, XChaCha20-Poly1305, and Argon2id. The {@link layer}
 * aggregate provides every service except
 * Argon2id, which requires Node.js 24.7 or later and is provided separately by
 * {@link layerArgon2id}.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NodeCrypto from "node:crypto"
import * as Chacha from "./internal/chacha.ts"

/**
 * Layer that sets the `Crypto.SubtleCrypto` reference to `webcrypto.subtle`
 * from `node:crypto`.
 *
 * **When to use**
 *
 * Use to run the Web Crypto layers of `effect/crypto` on Node.js 18, which has
 * no `globalThis.crypto`. {@link layer} and the cluster layers include it.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSubtleCrypto: Layer.Layer<never> = Layer.succeed(
  Crypto.SubtleCrypto,
  NodeCrypto.webcrypto.subtle as SubtleCrypto
)

/**
 * Layer that provides `SecureRandom` using `randomFillSync` from `node:crypto`.
 *
 * **When to use**
 *
 * Use to replace `Crypto.layerSecureRandom` on Node.js 18, which has no
 * `globalThis.crypto`. {@link layer} includes it.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSecureRandom: Layer.Layer<Crypto.SecureRandom> = Layer.succeed(
  Crypto.SecureRandom,
  Crypto.makeSecureRandom((size) => NodeCrypto.randomFillSync(new Uint8Array(size)))
)

/**
 * Layer that provides `Crypto.Md5` using `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerMd5: Layer.Layer<Crypto.Md5> = Layer.succeed(Crypto.Md5, {
  digest: (data) =>
    Effect.try({
      try: () => Uint8Array.from(NodeCrypto.createHash("md5").update(data).digest()),
      catch: (cause) =>
        new Crypto.CryptoError({
          algorithm: "MD5",
          method: "digest",
          reason: new Crypto.Unknown({ description: "Could not compute digest", cause })
        })
    })
})

/**
 * Layer that provides `Crypto.ChaCha20Poly1305` using `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerChaCha20Poly1305: Layer.Layer<Crypto.ChaCha20Poly1305> = Layer.sync(
  Crypto.ChaCha20Poly1305,
  Chacha.makeChaCha20Poly1305
)

/**
 * Layer that provides `Crypto.XChaCha20Poly1305` using `node:crypto`.
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
export const layerXChaCha20Poly1305: Layer.Layer<Crypto.XChaCha20Poly1305> = Layer.sync(
  Crypto.XChaCha20Poly1305,
  Chacha.makeXChaCha20Poly1305
)

const argon2Failure = (method: string, cause: unknown): Crypto.CryptoError => {
  const unsupported = typeof cause === "object" && cause !== null &&
    "code" in cause && cause.code === "ERR_CRYPTO_ARGON2_NOT_SUPPORTED"
  return new Crypto.CryptoError({
    algorithm: "Argon2id",
    method,
    reason: unsupported
      ? new Crypto.Unsupported({ description: "Argon2id is not supported by this runtime", cause })
      : new Crypto.Unknown({ description: "Could not derive an Argon2id key", cause })
  })
}

const isIntegerIn = (n: number, min: number, max: number): boolean => Number.isSafeInteger(n) && n >= min && n <= max

const validArgon2Parameters = (options: Omit<Crypto.Argon2idOptions, "length">): boolean => {
  const uint32 = (n: number) => isIntegerIn(n, 1, 0xffff_ffff)
  return uint32(options.memoryKiB) && uint32(options.passes) && isIntegerIn(options.parallelism, 1, 0xff_ffff) &&
    options.memoryKiB >= 8 * options.parallelism && options.salt.length >= 8
}

const validArgon2Length = (length: number): boolean => isIntegerIn(length, 4, 0xffff_ffff)

const argon2id = (method: string, options: Crypto.Argon2idOptions) =>
  Effect.callback<Uint8Array, Crypto.CryptoError>((resume) => {
    if (!validArgon2Parameters(options) || !validArgon2Length(options.length)) {
      return resume(Effect.fail(
        new Crypto.CryptoError({
          algorithm: "Argon2id",
          method,
          reason: new Crypto.BadArgument({
            description: "invalid Argon2id memory, passes, parallelism, output length, or salt"
          })
        })
      ))
    }
    try {
      NodeCrypto.argon2("argon2id", {
        message: options.password,
        nonce: options.salt,
        memory: options.memoryKiB,
        passes: options.passes,
        parallelism: options.parallelism,
        tagLength: options.length,
        ...(options.secret === undefined ? {} : { secret: options.secret }),
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
 * Layer that provides `Crypto.Argon2id` using native `node:crypto`
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
export const layerArgon2id: Layer.Layer<Crypto.Argon2id, Crypto.CryptoError> = Layer.effect(
  Crypto.Argon2id,
  Effect.suspend(() =>
    typeof NodeCrypto.argon2 === "function"
      ? Effect.succeed(Crypto.Argon2id.of({
        derive: (options) => argon2id("derive", options),
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
        new Crypto.CryptoError({
          algorithm: "Argon2id",
          method: "layer",
          reason: new Crypto.Unsupported({ description: "Argon2id is not supported by this runtime" })
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
  | Crypto.SecureRandom
  | Crypto.Md5
  | Crypto.Sha1
  | Crypto.Sha2
  | Crypto.Hmac
  | Crypto.Aes
  | Crypto.ChaCha20Poly1305
  | Crypto.XChaCha20Poly1305
  | Crypto.Hkdf
  | Crypto.Pbkdf2
  | Crypto.Ed25519
  | Crypto.Ecdsa
  | Crypto.Rsa
  | Crypto.Ecdh

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
 * `Crypto.ed25519PublicKeyFromJwk` also reach Web Crypto on Node.js 18.
 *
 * @stability unstable
 * @category layers
 * @since 1.0.0
 */
export const layer: Layer.Layer<NodeCryptoServices> = Layer.mergeAll(
  Crypto.layerSha1,
  Crypto.layerSha2,
  Crypto.layerHmac,
  Crypto.layerAes,
  Crypto.layerHkdf,
  Crypto.layerPbkdf2,
  Crypto.layerEd25519,
  Crypto.layerEcdsa,
  Crypto.layerRsa,
  Crypto.layerEcdh
).pipe(
  // `layerSubtleCrypto` always supplies Web Crypto, so the layers cannot fail.
  Layer.orDie,
  // Also exposes the reference, so key conversions reach Web Crypto on Node.js 18.
  Layer.provideMerge(layerSubtleCrypto),
  Layer.merge(Layer.mergeAll(layerSecureRandom, layerMd5, layerChaCha20Poly1305, layerXChaCha20Poly1305))
)
