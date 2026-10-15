/**
 * Authenticated encryption: AES-GCM, ChaCha20-Poly1305, and
 * XChaCha20-Poly1305.
 *
 * The {@link Aead} service generates keys, encrypts, and decrypts. The
 * top-level {@link key}, {@link fromCryptoKey}, and {@link toBytes} functions
 * build and export keys without a service.
 *
 * Ciphertext is `ciphertext‖tag` with a 16-byte tag for every algorithm, the
 * layout WebCrypto produces. A tampered ciphertext, tag, or additional data
 * fails decryption with a `DecryptionFailed` reason that carries no detail.
 *
 * AES-GCM runs on `crypto.subtle`. ChaCha20-Poly1305 and XChaCha20-Poly1305
 * run a pure TypeScript implementation vendored from `@noble/ciphers` 2.4.0,
 * because WebCrypto does not provide them everywhere. Cure53 audited
 * `@noble/ciphers` 1.0.0 in 2024.
 *
 * Keys are opaque. They hold either key bytes or, for AES-GCM, a `CryptoKey`,
 * display only their algorithm, and compare by reference.
 *
 * **Gotchas**
 *
 * Never reuse a nonce with the same key. Random 12-byte nonces risk a
 * collision after about 2^32 messages under one key: use a counter, or
 * XChaCha20-Poly1305, whose 24-byte nonces can be random.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import type { Inspectable } from "../Inspectable.ts"
import * as Layer from "../Layer.ts"
import * as CryptoError from "./CryptoError.ts"
import * as Chacha from "./internal/chacha.ts"
import * as KeyModel from "./internal/key.ts"
import * as internal from "./internal/webCrypto.ts"
import * as SecureRandom from "./SecureRandom.ts"
import { WebCrypto } from "./WebCrypto.ts"

const TypeId = "~effect/crypto/Aead/Key" as const

/**
 * The pure TypeScript code of an algorithm that WebCrypto does not provide.
 *
 * **Details**
 *
 * `encrypt` returns `ciphertext‖tag`. `decrypt` takes `ciphertext‖tag` and
 * returns `undefined` when the tag does not match. Both receive arguments the
 * layer has already checked.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Implementation {
  readonly encrypt: (key: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array, aad: Uint8Array) => Uint8Array
  readonly decrypt: (
    key: Uint8Array,
    nonce: Uint8Array,
    ciphertext: Uint8Array,
    aad: Uint8Array
  ) => Uint8Array | undefined
}

/**
 * An authenticated encryption algorithm, such as {@link aes256Gcm}.
 *
 * **Details**
 *
 * `keyLength` and `nonceLength` are in bytes. `implementation` is the pure
 * TypeScript code for algorithms that WebCrypto does not provide, which a
 * layer calls when it has no native mapping for `name`. The `~flags` and
 * `~keys` members exist only in the types: they record that keys have a raw
 * form, whether the algorithm runs on `crypto.subtle` (`Native`), and which
 * key type the algorithm produces.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Algorithm<Native extends boolean = boolean> {
  readonly name: "aes128Gcm" | "aes256Gcm" | "chacha20Poly1305" | "xchacha20Poly1305"
  readonly keyLength: 16 | 32
  readonly nonceLength: 12 | 24
  readonly implementation: Implementation | undefined
  readonly "~flags"?: { readonly rawPrivate: true; readonly rawPublic: false; readonly native: Native } | undefined
  readonly "~keys"?: { readonly key: Key<Algorithm> } | undefined
}

/**
 * AES-128-GCM, with a 16-byte key and a 12-byte nonce.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const aes128Gcm: Algorithm<true> = {
  name: "aes128Gcm",
  keyLength: 16,
  nonceLength: 12,
  implementation: undefined
}

/**
 * AES-256-GCM, with a 32-byte key and a 12-byte nonce.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const aes256Gcm: Algorithm<true> = {
  name: "aes256Gcm",
  keyLength: 32,
  nonceLength: 12,
  implementation: undefined
}

const chachaImplementation = (
  aead: (key: Uint8Array, nonce: Uint8Array, aad?: Uint8Array) => Chacha.Aead
): Implementation => ({
  encrypt: (key, nonce, plaintext, aad) => aead(key, nonce, aad).encrypt(plaintext),
  decrypt: (key, nonce, ciphertext, aad) => aead(key, nonce, aad).decrypt(ciphertext)
})

/**
 * ChaCha20-Poly1305 (RFC 8439), with a 32-byte key and a 12-byte nonce.
 *
 * **Details**
 *
 * Runs the pure TypeScript implementation under `layerWebCrypto`, even where
 * `crypto.subtle` provides it, so every runtime takes one code path.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const chacha20Poly1305: Algorithm<false> = {
  name: "chacha20Poly1305",
  keyLength: 32,
  nonceLength: 12,
  implementation: /* @__PURE__ */ chachaImplementation(Chacha.chacha20Poly1305)
}

/**
 * XChaCha20-Poly1305 (draft-irtf-cfrg-xchacha-03), with a 32-byte key and a
 * 24-byte nonce.
 *
 * **When to use**
 *
 * Use when nonces are generated randomly, since 24-byte nonces make
 * collisions negligible. The output is compatible with libsodium's
 * `crypto_aead_xchacha20poly1305_ietf`.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const xchacha20Poly1305: Algorithm<false> = {
  name: "xchacha20Poly1305",
  keyLength: 32,
  nonceLength: 24,
  implementation: /* @__PURE__ */ chachaImplementation(Chacha.xchacha20Poly1305)
}

/**
 * An opaque authenticated encryption key for the algorithm `A`.
 *
 * **Details**
 *
 * The key holds either key bytes or a `CryptoKey` from {@link fromCryptoKey}.
 * `toString`, `toJSON`, and `inspect` show only the algorithm. Keys compare
 * by reference and do not implement `Equal`, because comparing key bytes is
 * not constant time.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Key<out A extends Algorithm = Algorithm> extends Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly algorithm: A
}

const KeyProto = KeyModel.redactedProto(TypeId, "Aead.Key")

/**
 * Per-message inputs for {@link Aead}.
 *
 * **Details**
 *
 * `nonce` must have the algorithm's nonce length. `aad` is authenticated
 * without being encrypted and defaults to empty. Decryption must use the same
 * nonce and additional data as encryption.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly nonce: Uint8Array
  readonly aad?: Uint8Array | undefined
}

/**
 * Service that generates keys, encrypts, and decrypts with authentication.
 *
 * **Example** (Encrypting with XChaCha20-Poly1305)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer } from "effect"
 * import { Aead, SecureRandom } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const aead = yield* Aead.Aead
 *   const random = yield* SecureRandom.SecureRandom
 *   const key = yield* aead.generateKey(Aead.xchacha20Poly1305)
 *   const nonce = yield* random.randomBytes(24)
 *   const sealed = yield* aead.encrypt(key, new TextEncoder().encode("secret"), { nonce })
 *   const opened = yield* aead.decrypt(key, sealed, { nonce })
 *   return [sealed.length, new TextDecoder().decode(opened)]
 * })
 *
 * const layer = Aead.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
 * await Effect.runPromise(program.pipe(Effect.provide(layer))) // => [22, "secret"]
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Aead extends Context.Service<Aead, {
  /**
   * Generates a random key of the algorithm's length from `SecureRandom`
   * bytes.
   */
  readonly generateKey: <A extends Algorithm>(algorithm: A) => Effect.Effect<Key<A>, CryptoError.CryptoError>
  /**
   * Encrypts `plaintext` and appends the 16-byte tag.
   */
  readonly encrypt: (
    key: Key,
    plaintext: Uint8Array,
    options: Options
  ) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Checks the tag at the end of `ciphertext` and decrypts the rest, failing
   * with a `DecryptionFailed` reason when the tag does not match.
   */
  readonly decrypt: (
    key: Key,
    ciphertext: Uint8Array,
    options: Options
  ) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
}>()("effect/crypto/Aead") {}

const fail = (method: string, reason: CryptoError.CryptoErrorReason) => KeyModel.fail("Aead", method, reason)

const decryptionFailed = () => fail("decrypt", new CryptoError.DecryptionFailed())

// GCM limits the plaintext to 2^39 - 256 bits.
const maxGcmPlaintext = 2 ** 36 - 32

const tagLength = 16

// Every check runs before any work, so the pure TypeScript code only throws on
// a bug, and WebCrypto's `OperationError` only means a failed tag check.
const checkArguments = (
  method: "encrypt" | "decrypt",
  key: Key,
  data: Uint8Array,
  options: Options
): Effect.Effect<never, CryptoError.CryptoError> | undefined => {
  const algorithm = key.algorithm
  if (options.nonce.length !== algorithm.nonceLength) {
    return fail(
      method,
      new CryptoError.InvalidArgument({
        description: `${algorithm.name} nonces must contain exactly ${algorithm.nonceLength} bytes`
      })
    )
  }
  if (method === "encrypt") {
    if (algorithm.implementation === undefined && data.length > maxGcmPlaintext) {
      return fail(
        method,
        new CryptoError.InvalidArgument({ description: "AES-GCM plaintext cannot exceed 2^36 - 32 bytes" })
      )
    }
  } else if (data.length < tagLength) {
    return decryptionFailed()
  }
  return undefined
}

const runImplementation = (
  method: "encrypt" | "decrypt",
  implementation: Implementation,
  key: Key,
  data: Uint8Array,
  options: Options
): Effect.Effect<Uint8Array, CryptoError.CryptoError> => {
  const stored = KeyModel.material(key)
  if (stored._tag !== "Bytes") {
    return fail(method, new CryptoError.InvalidKey({ description: `${key.algorithm.name} keys must hold bytes` }))
  }
  const aad = options.aad ?? new Uint8Array(0)
  if (method === "encrypt") {
    return Effect.sync(() => implementation.encrypt(stored.bytes, options.nonce, data, aad))
  }
  return Effect.suspend(() => {
    const plaintext = implementation.decrypt(stored.bytes, options.nonce, data, aad)
    return plaintext === undefined ? decryptionFailed() : Effect.succeed(plaintext)
  })
}

const pure = (
  method: "encrypt" | "decrypt",
  key: Key,
  data: Uint8Array,
  options: Options
): Effect.Effect<Uint8Array, CryptoError.CryptoError> | undefined => {
  const implementation = key.algorithm.implementation
  return implementation === undefined ? undefined : runImplementation(method, implementation, key, data, options)
}

/**
 * Layer that provides `Aead` on the `WebCrypto` reference.
 *
 * **Details**
 *
 * AES-GCM runs on `crypto.subtle`. The layer imports a byte-backed key on
 * first use and caches the `CryptoKey`. ChaCha20-Poly1305 and
 * XChaCha20-Poly1305 always run the pure TypeScript implementation, with no
 * feature detection. Generated keys come from `SecureRandom`, so a seeded
 * `SecureRandom` gives reproducible keys.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebCrypto: Layer.Layer<Aead, never, SecureRandom.SecureRandom> = Layer.effect(
  Aead,
  Effect.gen(function*() {
    const random = yield* SecureRandom.SecureRandom
    const crypto = yield* WebCrypto
    const cryptoKeyFor = KeyModel.makeCache((subtle, bytes) =>
      subtle.importKey("raw", bytes as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"])
    )
    const gcm = (method: "encrypt" | "decrypt", key: Key, data: Uint8Array, options: Options) =>
      Effect.suspend(() => {
        const subtle = crypto?.subtle
        if (subtle === undefined) return Effect.die(internal.subtleUnavailable())
        const params: AesGcmParams = {
          name: "AES-GCM",
          iv: options.nonce as BufferSource,
          tagLength: 128,
          ...(options.aad === undefined ? {} : { additionalData: options.aad as BufferSource })
        }
        return Effect.tryPromise({
          try: async () =>
            new Uint8Array(await subtle[method](params, await cryptoKeyFor(subtle, key), data as BufferSource)),
          catch: (cause) =>
            internal.webCryptoError(
              "Aead",
              method,
              cause,
              method === "decrypt" ? () => new CryptoError.DecryptionFailed() : undefined
            )
        })
      })
    const run = (method: "encrypt" | "decrypt") => (key: Key, data: Uint8Array, options: Options) =>
      Effect.suspend(() =>
        checkArguments(method, key, data, options) ?? pure(method, key, data, options) ??
          gcm(method, key, data, options)
      )
    return Aead.of({
      generateKey: (algorithm) =>
        Effect.map(
          random.randomBytes(algorithm.keyLength),
          (bytes) => KeyModel.make(KeyProto, algorithm, { _tag: "Bytes", bytes })
        ),
      encrypt: run("encrypt"),
      decrypt: run("decrypt")
    })
  })
)

/**
 * Builds a key from raw key bytes.
 *
 * **Details**
 *
 * The bytes are copied into a new `Uint8Array`, so later changes to the input,
 * including a Node.js `Buffer`, do not reach the key. A length other than the
 * algorithm's key length fails with an `InvalidKey` reason. There is no
 * AES-192.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const key = <A extends Algorithm>(
  algorithm: A,
  bytes: Uint8Array
): Effect.Effect<Key<A>, CryptoError.CryptoError> =>
  KeyModel.fromBytes(
    "Aead",
    "key",
    KeyProto,
    algorithm,
    bytes,
    (length) =>
      length === algorithm.keyLength
        ? undefined
        : `Expected a ${algorithm.keyLength}-byte key for ${algorithm.name}, not ${length} bytes`
  )

/**
 * Builds an AES-GCM key from an existing `CryptoKey`, such as a
 * non-extractable one.
 *
 * **Details**
 *
 * The `CryptoKey` must be a secret AES-GCM key of the algorithm's length with
 * both the `encrypt` and `decrypt` usages, since a key reaches both
 * operations. Otherwise the constructor fails with an `InvalidKey` reason. It
 * must come from the `Crypto` object of the `WebCrypto` reference.
 *
 * ChaCha20-Poly1305 and XChaCha20-Poly1305 never run on `crypto.subtle`, so
 * passing them is a type error.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromCryptoKey = <A extends Algorithm<true>>(
  algorithm: A,
  cryptoKey: CryptoKey
): Effect.Effect<Key<A>, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    const problem = algorithm.implementation !== undefined
      ? `${algorithm.name} keys cannot be CryptoKeys`
      : KeyModel.checkCryptoKey(cryptoKey, {
        type: "secret",
        name: "AES-GCM",
        usages: ["encrypt", "decrypt"],
        usagePolicy: "all",
        check: (keyAlgorithm) => {
          const length = (keyAlgorithm as AesKeyAlgorithm).length
          return length === algorithm.keyLength * 8
            ? undefined
            : `Expected a ${algorithm.keyLength * 8}-bit AES-GCM key, not ${length} bits`
        }
      })
    return problem === undefined
      ? Effect.succeed(KeyModel.make<Key<A>>(KeyProto, algorithm, { _tag: "CryptoKey", cryptoKey }))
      : fail("fromCryptoKey", new CryptoError.InvalidKey({ description: problem }))
  })

/**
 * Exports a key's bytes.
 *
 * **Details**
 *
 * Returns a fresh `Uint8Array` that shares no memory with the key. A
 * `CryptoKey`-backed key is exported on the `WebCrypto` reference, and fails
 * with a `NotExtractable` reason when the `CryptoKey` is not extractable.
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const toBytes = (key: Key): Effect.Effect<Uint8Array, CryptoError.CryptoError> =>
  KeyModel.toBytes("Aead", key, "raw")
