/**
 * Node.js layers for the `effect/crypto` modules, also used by Bun.
 *
 * {@link layerDigest} runs MD5 and SHA on `node:crypto`, and
 * {@link layerSecureRandom} re-exports the core WebCrypto layer. There is no
 * bundled layer: provide each family's layer where it is used.
 *
 * The ChaCha20-Poly1305, XChaCha20-Poly1305, and Argon2id layers serve the
 * per-algorithm modules until the `Aead` and `Kdf` modules replace them.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as Argon2 from "effect/crypto/Argon2"
import * as ChaCha20Poly1305 from "effect/crypto/ChaCha20Poly1305"
import * as CryptoError from "effect/crypto/CryptoError"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as NodeCrypto from "node:crypto"
import * as Chacha from "./internal/chacha.ts"

/**
 * Layer that provides `SecureRandom` from `getRandomValues` on the `WebCrypto`
 * reference.
 *
 * **Details**
 *
 * This is `SecureRandom.layerWebCrypto`, re-exported so that Node.js programs
 * take every crypto layer from `NodeCrypto`. `node:crypto` adds nothing here.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSecureRandom: Layer.Layer<SecureRandom.SecureRandom> = SecureRandom.layerWebCrypto

const nodeHashNames: Record<Digest.Algorithm["name"], string> = {
  "MD5": "md5",
  "SHA-1": "sha1",
  "SHA-256": "sha256",
  "SHA-384": "sha384",
  "SHA-512": "sha512"
}

// Copies the Buffer, which may be a view into Node's shared pool.
const nodeDigest = (algorithm: Digest.Algorithm, data: Uint8Array): Uint8Array =>
  new Uint8Array(NodeCrypto.createHash(nodeHashNames[algorithm.name]).update(data).digest())

/**
 * Layer that provides `Digest` using `createHash` from `node:crypto`.
 *
 * **Details**
 *
 * MD5 and the SHA algorithms run synchronously on `node:crypto`. On Node.js,
 * `crypto.subtle.digest` sends each call to the threadpool, which is
 * noticeably slower for small inputs. Output is identical to
 * `Digest.layerWebCrypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerDigest: Layer.Layer<Digest.Digest> = Layer.succeed(Digest.Digest, {
  digest: (algorithm, data) => Effect.sync(() => nodeDigest(algorithm, data)),
  digestHex: (algorithm, data) =>
    Effect.sync(() => NodeCrypto.createHash(nodeHashNames[algorithm.name]).update(data).digest("hex"))
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

// Only a missing Argon2id engine is a typed failure; anything else is a defect.
const argon2Failure = (method: string, cause: unknown): Effect.Effect<never, CryptoError.CryptoError> =>
  typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ERR_CRYPTO_ARGON2_NOT_SUPPORTED"
    ? Effect.fail(
      new CryptoError.CryptoError({
        module: "Argon2",
        method,
        reason: new CryptoError.Unsupported({ description: "Argon2id is not supported by this runtime", cause })
      })
    )
    : Effect.die(cause)

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
          module: "Argon2",
          method,
          reason: new CryptoError.InvalidArgument({
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
        if (cause) resume(argon2Failure(method, cause))
        else resume(Effect.succeed(new Uint8Array(key.buffer, key.byteOffset, key.length)))
      })
    } catch (cause) {
      resume(argon2Failure(method, cause))
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
          module: "Argon2",
          method: "layer",
          reason: new CryptoError.Unsupported({ description: "Argon2id is not supported by this runtime" })
        })
      )
  )
)
