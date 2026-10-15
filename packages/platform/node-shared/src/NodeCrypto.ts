/**
 * Node.js layers for the `effect/crypto` modules, also used by Bun.
 *
 * {@link layerDigest} runs MD5 and SHA on `node:crypto`, {@link layerMac} runs
 * HMAC on `node:crypto`, {@link layerKdf} adds Argon2id, {@link layerAead}
 * runs ChaCha20-Poly1305 on `node:crypto`, and {@link layerSecureRandom},
 * {@link layerCipher}, {@link layerSignature}, and {@link layerKeyAgreement}
 * re-export the core WebCrypto layers. Each Node.js layer
 * handles only the algorithms and keys it exists for and hands the rest to
 * the core WebCrypto implementation. There is no bundled layer: provide each
 * family's layer where it is used.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as Aead from "effect/crypto/Aead"
import * as Cipher from "effect/crypto/Cipher"
import * as CryptoError from "effect/crypto/CryptoError"
import * as Digest from "effect/crypto/Digest"
import * as Kdf from "effect/crypto/Kdf"
import * as KeyAgreement from "effect/crypto/KeyAgreement"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NodeCrypto from "node:crypto"

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

// The material of an `effect/crypto` key, shared by `effect` through
// `Symbol.for`: key bytes, or a `CryptoKey`. This is an internal protocol
// between `effect` and its platform packages, not a public API.
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

// Copies into a fresh array, wiping the parts, so no plaintext stays in
// Node.js's shared Buffer pool.
const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
    part.fill(0)
  }
  return output
}

const chachaEncrypt = (bytes: Uint8Array, plaintext: Uint8Array, options: Aead.Options): Uint8Array => {
  const cipher = NodeCrypto.createCipheriv("chacha20-poly1305", bytes, options.nonce, { authTagLength: 16 })
  if (options.aad !== undefined) cipher.setAAD(options.aad)
  return concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
}

const chachaDecrypt = (
  bytes: Uint8Array,
  ciphertext: Uint8Array,
  options: Aead.Options
): Effect.Effect<Uint8Array, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    const decipher = NodeCrypto.createDecipheriv("chacha20-poly1305", bytes, options.nonce, { authTagLength: 16 })
    if (options.aad !== undefined) decipher.setAAD(options.aad)
    decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16))
    const plaintext = decipher.update(ciphertext.subarray(0, ciphertext.length - 16))
    try {
      // `final` throws only when the tag does not match.
      return Effect.succeed(concat([plaintext, decipher.final()]))
    } catch {
      plaintext.fill(0)
      return Effect.fail(
        new CryptoError.CryptoError({ module: "Aead", method: "decrypt", reason: new CryptoError.DecryptionFailed() })
      )
    }
  })

/**
 * Layer that provides `Aead`, running ChaCha20-Poly1305 on `node:crypto`.
 *
 * **Details**
 *
 * Byte-backed ChaCha20-Poly1305 keys encrypt and decrypt synchronously on
 * `node:crypto`. Everything else goes through `Aead.layerWebCrypto`: AES-GCM on
 * `crypto.subtle`, XChaCha20-Poly1305 on its pure TypeScript implementation,
 * and arguments that fail a check, so errors are identical to the core layer.
 * Bun's `node:crypto` lacks ChaCha20-Poly1305, so on Bun this layer is the
 * core layer. Output is identical to `Aead.layerWebCrypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerAead: Layer.Layer<Aead.Aead, never, SecureRandom.SecureRandom> = Layer.effect(
  Aead.Aead,
  Effect.gen(function*() {
    const core = yield* Aead.Aead
    if (!NodeCrypto.getCiphers().includes("chacha20-poly1305")) return core
    // The bytes of a ChaCha20-Poly1305 key whose message passes the core
    // layer's checks, or `undefined` to hand the message to the core layer.
    const nativeBytes = (key: Aead.Key, options: Aead.Options) =>
      key.algorithm.name === "chacha20Poly1305" && options.nonce.length === 12 ? keyBytes(key) : undefined
    return Aead.Aead.of({
      generateKey: core.generateKey,
      encrypt: (key, plaintext, options) =>
        Effect.suspend(() => {
          const bytes = nativeBytes(key, options)
          return bytes === undefined
            ? core.encrypt(key, plaintext, options)
            : Effect.sync(() => chachaEncrypt(bytes, plaintext, options))
        }),
      decrypt: (key, ciphertext, options) =>
        Effect.suspend(() => {
          const bytes = nativeBytes(key, options)
          return bytes === undefined || ciphertext.length < 16
            ? core.decrypt(key, ciphertext, options)
            : chachaDecrypt(bytes, ciphertext, options)
        })
    })
  })
).pipe(Layer.provide(Aead.layerWebCrypto))

/**
 * Layer that provides `Cipher` from `crypto.subtle` on the `WebCrypto`
 * reference.
 *
 * **Details**
 *
 * This is `Cipher.layerWebCrypto`, re-exported so that Node.js programs take
 * every crypto layer from `NodeCrypto`. Node.js's `crypto.subtle` already
 * runs AES-CTR and AES-CBC on OpenSSL.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerCipher: Layer.Layer<Cipher.Cipher, never, SecureRandom.SecureRandom> = Cipher.layerWebCrypto

/**
 * Layer that provides `Signature` on Node.js's `crypto.subtle`.
 *
 * **Details**
 *
 * This is `Signature.layerWebCrypto`, re-exported so that Node.js programs
 * take every crypto layer from `NodeCrypto`. `CryptoKey`-backed keys go
 * through Node.js's `crypto.subtle`, because `KeyObject.from(cryptoKey)` is
 * deprecated (DEP0204).
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSignature: Layer.Layer<Signature.Signature, never, SecureRandom.SecureRandom> =
  Signature.layerWebCrypto

/**
 * Layer that provides `KeyAgreement` on Node.js's `crypto.subtle`.
 *
 * **Details**
 *
 * This is `KeyAgreement.layerWebCrypto`, re-exported so that Node.js programs
 * take every crypto layer from `NodeCrypto`. `CryptoKey`-backed keys go
 * through Node.js's `crypto.subtle`, because `KeyObject.from(cryptoKey)` is
 * deprecated (DEP0204).
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerKeyAgreement: Layer.Layer<KeyAgreement.KeyAgreement, never, SecureRandom.SecureRandom> =
  KeyAgreement.layerWebCrypto
