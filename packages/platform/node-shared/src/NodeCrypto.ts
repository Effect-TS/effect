/**
 * Node-compatible implementation of Effect's `Crypto` service.
 *
 * This module builds the service from `node:crypto`. Random data comes from
 * `randomFillSync`, `createHash` and `createHmac` provide digests and
 * authentication, asynchronous `pbkdf2` derives password keys, and
 * `publicEncrypt` performs RSA-OAEP encryption.
 * Node's native `webcrypto.subtle` provides managed keys, AES-GCM, AES-CTR,
 * RSA-OAEP decryption, RSA-PSS, RSASSA-PKCS1-v1_5, ECDSA, Ed25519, and ECDH
 * and X25519 key agreement. Native Argon2id is used when available.
 * XChaCha20-Poly1305 uses HChaCha20 nonce extension followed by native
 * ChaCha20-Poly1305. It exports `make` as the concrete service value and
 * `layer` for providing it through Effect context.
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
  ...EffectCrypto.makeSubtle(NodeCrypto.webcrypto.subtle as unknown as SubtleCrypto),
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
      const fail = (cause: unknown) =>
        Effect.fail(PlatformError.systemError({
          module: "Crypto",
          method: "argon2id",
          _tag: "Unknown",
          description: "Could not derive an Argon2id key",
          cause
        }))
      try {
        if (typeof NodeCrypto.argon2 !== "function") throw new Error("Native Argon2id is unavailable")
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
  rsaOaepEncrypt: (options) =>
    Effect.try({
      try: () => {
        const hash = options.hash ?? "SHA-256"
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
      const fail = (cause: unknown) =>
        Effect.fail(PlatformError.systemError({
          module: "Crypto",
          method: "pbkdf2",
          _tag: "Unknown",
          description: "Could not derive password key",
          cause
        }))
      try {
        NodeCrypto.pbkdf2(password, salt, iterations, length, toHashAlgorithm(algorithm), (cause, key) => {
          resume(cause ? fail(cause) : Effect.succeed(Uint8Array.from(key)))
        })
      } catch (cause) {
        resume(fail(cause))
      }
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
