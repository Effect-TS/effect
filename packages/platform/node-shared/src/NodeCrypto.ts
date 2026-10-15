/**
 * Node.js layers for the `effect/crypto` modules, also used by Bun.
 *
 * {@link layerDigest} runs MD5 and SHA on `node:crypto`, {@link layerMac} runs
 * HMAC on `node:crypto`, {@link layerKdf} adds Argon2id, and
 * {@link layerSecureRandom} re-exports the core WebCrypto layer. Each Node.js
 * layer handles only the algorithms and keys it exists for and hands the rest
 * to the core WebCrypto implementation. There is no bundled layer: provide
 * each family's layer where it is used.
 *
 * The ChaCha20-Poly1305 and XChaCha20-Poly1305 layers serve the per-algorithm
 * module until the `Aead` module replaces it.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as ChaCha20Poly1305 from "effect/crypto/ChaCha20Poly1305"
import * as CryptoError from "effect/crypto/CryptoError"
import * as Digest from "effect/crypto/Digest"
import * as Kdf from "effect/crypto/Kdf"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
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

// The material of an `effect/crypto` key, shared by `effect` through
// `Symbol.for`: key bytes, or a `CryptoKey`.
const MaterialId = Symbol.for("~effect/crypto/Key/material")
type Material =
  | { readonly _tag: "Bytes"; readonly bytes: Uint8Array }
  | { readonly _tag: "CryptoKey"; readonly cryptoKey: CryptoKey }

const keyBytes = (key: object): Uint8Array | undefined => {
  const material = (key as { readonly [MaterialId]?: Material })[MaterialId]
  return material?._tag === "Bytes" ? material.bytes : undefined
}

const nodeHmac = (key: Mac.Key, bytes: Uint8Array, data: Uint8Array): Uint8Array =>
  new Uint8Array(NodeCrypto.createHmac(nodeHashNames[key.algorithm.hash.name], bytes).update(data).digest())

/**
 * Layer that provides `Mac` using `createHmac` from `node:crypto`.
 *
 * **Details**
 *
 * Byte-backed keys sign and verify synchronously on `node:crypto`, since
 * webhook verification is a server hot path. `CryptoKey`-backed keys and key
 * generation go through `Mac.layerWebCrypto`, which runs on Node.js's
 * `crypto.subtle`. Output is identical to `Mac.layerWebCrypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerMac: Layer.Layer<Mac.Mac, never, SecureRandom.SecureRandom> = Layer.effect(
  Mac.Mac,
  Effect.gen(function*() {
    const core = yield* Mac.Mac
    return Mac.Mac.of({
      generateKey: core.generateKey,
      sign: (key, data) => {
        const bytes = keyBytes(key)
        return bytes === undefined ? core.sign(key, data) : Effect.sync(() => nodeHmac(key, bytes, data))
      },
      verify: (key, tag, data) => {
        const bytes = keyBytes(key)
        if (bytes === undefined) return core.verify(key, tag, data)
        return Effect.sync(() => {
          const expected = nodeHmac(key, bytes, data)
          return expected.length === tag.length && NodeCrypto.timingSafeEqual(expected, tag)
        })
      }
    })
  })
).pipe(Layer.provide(Mac.layerWebCrypto))

const kdfFailure = (reason: CryptoError.CryptoErrorReason): Effect.Effect<never, CryptoError.CryptoError> =>
  Effect.fail(new CryptoError.CryptoError({ module: "Kdf", method: "derive", reason }))

const argon2Unsupported = (cause?: unknown) =>
  kdfFailure(
    new CryptoError.Unsupported({
      description: "NodeCrypto.layerKdf does not provide argon2id on this runtime",
      ...(cause === undefined ? {} : { cause })
    })
  )

// Only a missing Argon2id engine is a typed failure; anything else is a defect.
const argon2Failure = (cause: unknown): Effect.Effect<never, CryptoError.CryptoError> =>
  typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ERR_CRYPTO_ARGON2_NOT_SUPPORTED"
    ? argon2Unsupported(cause)
    : Effect.die(cause)

const isIntegerIn = (n: number, min: number, max: number): boolean => Number.isSafeInteger(n) && n >= min && n <= max

// The RFC 9106 bounds, checked before `node:crypto`, which throws on them.
const argon2Problem = (algorithm: Kdf.Argon2id, options: Kdf.DeriveOptions): string | undefined => {
  if (options.info !== undefined) return "info only applies to HKDF"
  const uint32 = (n: number) => isIntegerIn(n, 1, 0xffff_ffff)
  if (!uint32(algorithm.passes) || !isIntegerIn(algorithm.parallelism, 1, 0xff_ffff)) {
    return "passes must be between 1 and 2^32 - 1 and parallelism between 1 and 2^24 - 1"
  }
  if (!uint32(algorithm.memory) || algorithm.memory < 8 * algorithm.parallelism) {
    return "memory must be at least 8 KiB per lane and below 2^32 KiB"
  }
  if (options.salt.length < 8) return "salt must be at least 8 bytes"
  return isIntegerIn(options.length, 4, 0xffff_ffff) ? undefined : "length must be between 4 and 2^32 - 1 bytes"
}

const argon2id = (algorithm: Kdf.Argon2id, secret: Uint8Array, options: Kdf.DeriveOptions) =>
  Effect.callback<Uint8Array, CryptoError.CryptoError>((resume) => {
    const problem = argon2Problem(algorithm, options)
    if (problem !== undefined) return resume(kdfFailure(new CryptoError.InvalidArgument({ description: problem })))
    // Checked at call time, since Node.js added `argon2` in 24.7.
    if (typeof NodeCrypto.argon2 !== "function") return resume(argon2Unsupported())
    try {
      NodeCrypto.argon2("argon2id", {
        message: secret,
        nonce: options.salt,
        memory: algorithm.memory,
        passes: algorithm.passes,
        parallelism: algorithm.parallelism,
        tagLength: options.length
      }, (cause, key) => {
        if (cause) resume(argon2Failure(cause))
        else resume(Effect.succeed(new Uint8Array(key.buffer, key.byteOffset, key.length)))
      })
    } catch (cause) {
      resume(argon2Failure(cause))
    }
  }).pipe(Effect.uninterruptible)

/**
 * Layer that provides `Kdf`, adding Argon2id from `node:crypto`.
 *
 * **Details**
 *
 * Argon2id runs on `argon2` from `node:crypto`, which needs Node.js 24.7 or
 * later linked against OpenSSL 3.2, or Bun 1.4. Support is checked at call
 * time: on other runtimes, deriving with Argon2id fails with an `Unsupported`
 * reason. HKDF and PBKDF2 go through `Kdf.layerWebCrypto`, which keeps them
 * off the event loop.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerKdf: Layer.Layer<Kdf.Kdf> = Layer.effect(
  Kdf.Kdf,
  Effect.gen(function*() {
    const core = yield* Kdf.Kdf
    return Kdf.Kdf.of({
      derive: (algorithm, secret, options) =>
        algorithm._tag === "Argon2id" ? argon2id(algorithm, secret, options) : core.derive(algorithm, secret, options)
    })
  })
).pipe(Layer.provide(Kdf.layerWebCrypto))
