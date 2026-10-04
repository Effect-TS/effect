/**
 * Node-compatible implementation of Effect's `Crypto` service.
 *
 * This module builds the service from `node:crypto`, using `randomBytes` for
 * random data, `createHash` and `createHmac` for digests and authentication,
 * and asynchronous `pbkdf2` for password derivation. It exports
 * `make` as the concrete service value and `layer` for providing it through
 * Effect context.
 *
 * @since 1.0.0
 */
import * as EffectCrypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"
import * as NodeCrypto from "node:crypto"

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
 * @category constructors
 * @since 1.0.0
 */
export const make: EffectCrypto.Crypto = EffectCrypto.make({
  randomBytes: NodeCrypto.randomBytes,
  digest,
  rsaOaepEncrypt: (options) =>
    Effect.try({
      try: () => {
        const hash = options.hash ?? "SHA-256"
        if (!["SHA-1", "SHA-256", "SHA-384", "SHA-512"].includes(hash)) {
          throw new TypeError("Unsupported RSA-OAEP hash")
        }
        return Uint8Array.from(NodeCrypto.publicEncrypt({
          key: NodeCrypto.createPublicKey({ key: Buffer.from(options.publicKey), format: "der", type: "spki" }),
          padding: NodeCrypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: toHashAlgorithm(hash),
          ...(options.label === undefined ? {} : { oaepLabel: options.label })
        }, options.data))
      },
      catch: (cause) =>
        PlatformError.systemError({
          module: "Crypto",
          method: "rsaOaepEncrypt",
          _tag: "Unknown",
          description: "Could not encrypt with RSA-OAEP",
          cause
        })
    }),
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
    }),
  pbkdf2: (algorithm, password, salt, iterations, length) =>
    Effect.callback((resume) => {
      try {
        NodeCrypto.pbkdf2(password, salt, iterations, length, toHashAlgorithm(algorithm), (cause, key) => {
          resume(
            cause
              ? Effect.fail(PlatformError.systemError({
                module: "Crypto",
                method: "pbkdf2",
                _tag: "Unknown",
                description: "Could not derive password key",
                cause
              }))
              : Effect.succeed(Uint8Array.from(key))
          )
        })
      } catch (cause) {
        resume(Effect.fail(PlatformError.systemError({
          module: "Crypto",
          method: "pbkdf2",
          _tag: "Unknown",
          description: "Could not derive password key",
          cause
        })))
      }
    })
})

/**
 * Layer that provides the Node.js Crypto service implementation.
 *
 * @category layers
 * @since 1.0.0
 */
export const layer: Layer.Layer<EffectCrypto.Crypto> = Layer.succeed(EffectCrypto.Crypto, make)
