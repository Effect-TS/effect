/**
 * Node-compatible implementation of Effect's `Crypto` service.
 *
 * This module builds the service from `node:crypto`. Random data comes from
 * `randomFillSync`, and `createHash` and `createHmac` provide digests,
 * including MD5, and HMACs. Node's native `webcrypto.subtle` provides key
 * derivation, managed keys, encryption, signing, and key agreement. Native
 * Argon2id is used when available. XChaCha20-Poly1305 uses HChaCha20 nonce
 * extension followed by native ChaCha20-Poly1305. It exports `make` as the
 * concrete service value and `layer` for providing it through Effect context.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as EffectCrypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"
import * as NodeCrypto from "node:crypto"
import * as XChaCha from "./internal/xchacha.ts"

const toHashAlgorithm = (algorithm: EffectCrypto.DigestAlgorithm): string => {
  switch (algorithm) {
    case "MD5":
      return "md5"
    case "SHA-1":
      return "sha1"
    case "SHA-256":
      return "sha256"
    case "SHA-384":
      return "sha384"
    case "SHA-512":
      return "sha512"
  }
}

const digest: EffectCrypto.Crypto["digest"] = (algorithm, data) =>
  Effect.try({
    try: () => Uint8Array.from(NodeCrypto.createHash(toHashAlgorithm(algorithm)).update(data).digest()),
    catch: (cause) =>
      PlatformError.systemError({
        module: "Crypto",
        method: "digest",
        _tag: "Unknown",
        description: "Could not compute digest",
        cause
      })
  })

/**
 * The default Node.js Crypto service implementation.
 *
 * @stability unstable
 * @category constructors
 * @since 1.0.0
 */
export const make: EffectCrypto.Crypto = EffectCrypto.make({
  subtle: NodeCrypto.webcrypto.subtle as unknown as SubtleCrypto,
  randomBytes: (size) => NodeCrypto.randomFillSync(new Uint8Array(size)),
  digest,
  xchacha20poly1305Encrypt: XChaCha.encrypt,
  xchacha20poly1305Decrypt: XChaCha.decrypt,
  argon2id: (options) =>
    Effect.callback<Uint8Array, PlatformError.PlatformError>((resume) => {
      let password: Uint8Array | undefined
      let secret: Uint8Array | undefined
      const cleanup = () => {
        password?.fill(0)
        secret?.fill(0)
      }
      const fail = (cause: unknown) => {
        const unsupported = typeof cause === "object" && cause !== null &&
          "code" in cause && cause.code === "ERR_CRYPTO_ARGON2_NOT_SUPPORTED"
        return Effect.fail(PlatformError.systemError({
          module: "Crypto",
          method: "argon2id",
          _tag: unsupported ? "Unsupported" : "Unknown",
          description: unsupported
            ? "argon2id is not supported by this Crypto service"
            : "Could not derive an Argon2id key",
          cause
        }))
      }
      if (typeof NodeCrypto.argon2 !== "function") {
        return resume(Effect.fail(PlatformError.systemError({
          module: "Crypto",
          method: "argon2id",
          _tag: "Unsupported",
          description: "argon2id is not supported by this Crypto service"
        })))
      }
      try {
        password = new Uint8Array(options.password)
        secret = options.secret === undefined ? undefined : new Uint8Array(options.secret)
        NodeCrypto.argon2("argon2id", {
          message: password,
          nonce: new Uint8Array(options.salt),
          memory: options.memoryKiB,
          passes: options.passes,
          parallelism: options.parallelism,
          tagLength: options.length,
          ...(secret === undefined ? {} : { secret }),
          ...(options.associatedData === undefined ? {} : { associatedData: new Uint8Array(options.associatedData) })
        }, (cause, key) => {
          cleanup()
          if (cause) resume(fail(cause))
          else {
            const result = Uint8Array.from(key)
            key.fill(0)
            resume(Effect.succeed(result))
          }
        })
      } catch (cause) {
        cleanup()
        resume(fail(cause))
      }
    }).pipe(Effect.uninterruptible),
  hmac: (algorithm, key, data) =>
    Effect.try({
      try: () => Uint8Array.from(NodeCrypto.createHmac(toHashAlgorithm(algorithm), key).update(data).digest()),
      catch: (cause) =>
        PlatformError.systemError({
          module: "Crypto",
          method: "hmac",
          _tag: "Unknown",
          description: "Could not compute HMAC",
          cause
        })
    })
})

/**
 * Layer that provides the Node.js Crypto service implementation.
 *
 * @stability unstable
 * @category layers
 * @since 1.0.0
 */
export const layer: Layer.Layer<EffectCrypto.Crypto> = Layer.succeed(EffectCrypto.Crypto, make)
