/**
 * Defines a platform-independent service for cryptographic operations.
 *
 * Runtime packages provide concrete implementations backed by the host
 * platform's cryptography APIs. This module defines the service interface and a
 * constructor from platform cryptographic primitives. The service provides
 * secure random bytes and numbers, UUIDv4 and UUIDv7 generation, shuffling, and
 * message digests, message authentication codes, password key derivation,
 * key management, authenticated encryption, and signing and verification.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "./Context.ts"
import * as Effect from "./Effect.ts"
import * as internalRandom from "./internal/random.ts"
import * as Ulid from "./internal/ulid.ts"
import * as Uuid from "./internal/uuid.ts"
import * as PlatformError from "./PlatformError.ts"

const TypeId = "~effect/Crypto"

/**
 * Digest algorithms supported by the platform `Crypto` service.
 *
 * **Gotchas**
 *
 * MD5 and SHA-1 are included for interoperability with existing protocols.
 * The browser implementation does not support MD5. Do not use MD5 or SHA-1 for
 * new security-sensitive designs.
 *
 * **Example** (Using a digest algorithm)
 *
 * ```ts import.meta.vitest
 * import { Crypto } from "effect"
 *
 * const algorithm: Crypto.DigestAlgorithm = "SHA-256"
 * ```
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type DigestAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"

/**
 * Hash algorithms supported for message authentication and password derivation.
 *
 * @category models
 * @since 4.1.0
 */
export type HmacAlgorithm = Exclude<DigestAlgorithm, "MD5">

/**
 * Inputs for RSA-OAEP public-key encryption using a DER-encoded SPKI key.
 *
 * **Details**
 *
 * The hash defaults to SHA-256 and is also used for OAEP's mask generation.
 * SHA-1 is available for compatibility with legacy protocols.
 * The optional label must match the label used when decrypting the ciphertext.
 *
 * @category models
 * @since 4.1.0
 */
export interface RsaOaepOptions {
  readonly publicKey: Uint8Array
  readonly data: Uint8Array
  readonly hash?: HmacAlgorithm | undefined
  readonly label?: Uint8Array | undefined
}

/**
 * Elliptic curves supported for ECDSA keys.
 *
 * @category models
 * @since 4.1.0
 */
export type NamedCurve = "P-256" | "P-384" | "P-521"

/**
 * Algorithms and sizes for symmetric encryption and authentication keys.
 *
 * **Details**
 *
 * HMAC lengths are measured in bits and default to the hash's block size.
 * AES-GCM keys contain 128, 192, or 256 bits.
 *
 * @category models
 * @since 4.1.0
 */
export type SecretKeyAlgorithm =
  | { readonly name: "AES-GCM"; readonly length: 128 | 192 | 256 }
  | { readonly name: "HMAC"; readonly hash: HmacAlgorithm; readonly length?: number | undefined }

/**
 * Algorithms for RSA, ECDSA, and Ed25519 key pairs.
 *
 * **Details**
 *
 * RSA generation defaults to a 2048-bit modulus and exponent 65537. RSA
 * keys bind the selected hash to subsequent OAEP or PSS operations.
 *
 * @category models
 * @since 4.1.0
 */
export type KeyPairAlgorithm =
  | {
    readonly name: "RSA-OAEP" | "RSA-PSS"
    readonly hash: HmacAlgorithm
    readonly modulusLength?: number | undefined
    readonly publicExponent?: Uint8Array | undefined
  }
  | { readonly name: "ECDSA"; readonly namedCurve: NamedCurve }
  | { readonly name: "Ed25519" }

/**
 * Algorithms supported by managed cryptographic keys.
 *
 * @category models
 * @since 4.1.0
 */
export type KeyAlgorithm = SecretKeyAlgorithm | KeyPairAlgorithm

/**
 * Operations permitted for a managed cryptographic key.
 *
 * @category models
 * @since 4.1.0
 */
export type KeyUsage = "encrypt" | "decrypt" | "sign" | "verify"

/**
 * Exportability and permitted operations for generated or imported keys.
 *
 * **Details**
 *
 * Secret and private keys default to non-extractable. Imported public keys
 * default to extractable, and generated public keys are always extractable.
 * Usages default to the operations supported by the algorithm
 * and key type, and generated pairs divide usages between their two keys.
 *
 * @category models
 * @since 4.1.0
 */
export interface KeyOptions {
  readonly extractable?: boolean | undefined
  readonly usages?: ReadonlyArray<KeyUsage> | undefined
}

/**
 * An opaque cryptographic key with its algorithm, exportability, and usages.
 *
 * **Gotchas**
 *
 * Keys belong to their native backend. Key material is available only through
 * `exportKey` when the key is extractable. Metadata does not contain the key
 * material, and changing it cannot grant additional usages.
 *
 * @see {@link importKey}
 * @see {@link exportKey}
 *
 * @category models
 * @since 4.1.0
 */
export interface Key {
  readonly "~effect/Crypto/Key": "~effect/Crypto/Key"
  readonly type: "secret" | "public" | "private"
  readonly algorithm: KeyAlgorithm
  readonly extractable: boolean
  readonly usages: ReadonlyArray<KeyUsage>
}

/**
 * Public and private keys generated together for an asymmetric algorithm.
 *
 * @category models
 * @since 4.1.0
 */
export interface KeyPair {
  readonly publicKey: Key
  readonly privateKey: Key
}

/**
 * Binary formats for importing and exporting cryptographic keys.
 *
 * **Details**
 *
 * `raw` represents secret keys, `spki` represents DER public keys, and `pkcs8`
 * represents DER private keys. PKCS8 exports are unencrypted key material.
 *
 * @category models
 * @since 4.1.0
 */
export type KeyFormat = "raw" | "spki" | "pkcs8"

/**
 * Parameters for authenticated AES-GCM or RSA-OAEP encryption and decryption.
 *
 * **Details**
 *
 * AES-GCM uses a 12-byte IV and a 128-bit authentication tag appended to the
 * ciphertext. Additional data is authenticated without being encrypted.
 * RSA-OAEP uses the hash bound to the key and an optional binary label.
 *
 * **Gotchas**
 *
 * Never reuse an AES-GCM IV with the same key. Decryption must use the same
 * IV, additional data, or OAEP label as encryption.
 *
 * @category models
 * @since 4.1.0
 */
export type CipherOptions =
  | {
    readonly name: "AES-GCM"
    readonly iv: Uint8Array
    readonly additionalData?: Uint8Array | undefined
  }
  | { readonly name: "RSA-OAEP"; readonly label?: Uint8Array | undefined }

/**
 * Parameters for HMAC, RSA-PSS, ECDSA, or Ed25519 signatures.
 *
 * **Details**
 *
 * RSA-PSS salt lengths are measured in bytes and default to the key hash's
 * output size. ECDSA signatures use the fixed-width IEEE P1363 `r || s` format.
 * HMAC and RSA-PSS use the hash bound to their key. Ed25519 uses no external hash.
 *
 * @category models
 * @since 4.1.0
 */
export type SigningOptions =
  | { readonly name: "HMAC" | "Ed25519" }
  | { readonly name: "ECDSA"; readonly hash: HmacAlgorithm }
  | { readonly name: "RSA-PSS"; readonly saltLength?: number | undefined }

/**
 * Platform-agnostic cryptographic operations.
 *
 * **Details**
 *
 * `Crypto` implementations must use cryptographically secure platform APIs.
 * The random generator helpers are derived by the `make` constructor from
 * the random methods on this service.
 *
 * **Example** (Using cryptographic operations)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect, Layer } from "effect"
 *
 * const TestCrypto = Layer.succeed(
 *   Crypto.Crypto,
 *   Crypto.make({
 *     ...Crypto.makeSubtle(globalThis.crypto.subtle),
 *     randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size))
 *   })
 * )
 *
 * const program = Effect.gen(function*() {
 *   const crypto = yield* Crypto.Crypto
 *   const bytes = yield* crypto.randomBytes(16)
 *   const uuidv4 = yield* crypto.randomUUIDv4()
 *   const hash = yield* crypto.digest("SHA-256", bytes)
 *   return [bytes.length, uuidv4.length, hash.length]
 * })
 *
 * await Effect.runPromise(Effect.provide(program, TestCrypto)) // => [16, 36, 32]
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface Crypto {
  readonly [TypeId]: typeof TypeId

  /**
   * Generates a random integer in the range Number.MIN_SAFE_INTEGER to
   * Number.MAX_SAFE_INTEGER (both inclusive).
   */
  nextIntUnsafe(): number

  /**
   * Generates a random number in the range 0 (inclusive) to 1 (exclusive).
   */
  nextDoubleUnsafe(): number

  /**
   * Generates cryptographically secure random bytes.
   */
  randomBytes(size: number): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Computes a cryptographic digest for the supplied data.
   */
  digest(
    algorithm: DigestAlgorithm,
    data: Uint8Array
  ): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Computes an HMAC for the supplied key and data using a SHA hash.
   */
  hmac(
    algorithm: HmacAlgorithm,
    key: Uint8Array,
    data: Uint8Array
  ): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Derives a password key with PBKDF2 using a positive iteration count and
   * an output length measured in bytes. Invalid iterations or lengths fail
   * with `PlatformError.BadArgument` before invoking the platform primitive
   * when constructed with `make`.
   */
  pbkdf2(
    algorithm: HmacAlgorithm,
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    length: number
  ): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Encrypts data with an RSA public key using OAEP padding.
   */
  rsaOaepEncrypt(options: RsaOaepOptions): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Generates a symmetric key with the specified exportability and usages.
   */
  generateSecretKey(
    algorithm: SecretKeyAlgorithm,
    options?: KeyOptions
  ): Effect.Effect<Key, PlatformError.PlatformError>

  /**
   * Generates public and private keys for an asymmetric algorithm.
   */
  generateKeyPair(
    algorithm: KeyPairAlgorithm,
    options?: KeyOptions
  ): Effect.Effect<KeyPair, PlatformError.PlatformError>

  /**
   * Imports a binary key into the native backend.
   */
  importKey(
    format: KeyFormat,
    data: Uint8Array,
    algorithm: KeyAlgorithm,
    options?: KeyOptions
  ): Effect.Effect<Key, PlatformError.PlatformError>

  /**
   * Exports an extractable key in the requested binary format.
   */
  exportKey(format: KeyFormat, key: Key): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Encrypts plaintext using an AES-GCM secret key or RSA-OAEP public key.
   */
  encrypt(options: CipherOptions, key: Key, data: Uint8Array): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Decrypts ciphertext using an AES-GCM secret key or RSA-OAEP private key.
   */
  decrypt(options: CipherOptions, key: Key, data: Uint8Array): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Signs data using a secret or private key with signing usage.
   */
  sign(options: SigningOptions, key: Key, data: Uint8Array): Effect.Effect<Uint8Array, PlatformError.PlatformError>

  /**
   * Verifies a signature using a secret or public key with verification usage.
   */
  verify(
    options: SigningOptions,
    key: Key,
    signature: Uint8Array,
    data: Uint8Array
  ): Effect.Effect<boolean, PlatformError.PlatformError>

  /**
   * Generates a cryptographically secure random number between 0 (inclusive)
   * and 1 (exclusive).
   */
  readonly random: Effect.Effect<number>

  /**
   * Generates a cryptographically secure random boolean with equal probability
   * for both values.
   */
  readonly randomBoolean: Effect.Effect<boolean>

  /**
   * Generates a cryptographically secure random integer between
   * `Number.MIN_SAFE_INTEGER` and `Number.MAX_SAFE_INTEGER` (both inclusive).
   */
  readonly randomInt: Effect.Effect<number>

  /**
   * Generates a cryptographically secure random number between `min`
   * (inclusive) and `max` (exclusive).
   */
  randomBetween(min: number, max: number): Effect.Effect<number>

  /**
   * Generates a cryptographically secure random integer between `min` and `max`.
   *
   * **Details**
   *
   * The lower bound is rounded up with `Math.ceil` and the upper bound is
   * rounded down with `Math.floor`. By default the range is inclusive; set
   * `options.halfOpen: true` to exclude the upper bound.
   * Rejection sampling gives each integer the same probability.
   * Empty ranges and bounds that do not round to safe integers die with
   * `RangeError`.
   */
  randomIntBetween(min: number, max: number, options?: {
    readonly halfOpen?: boolean | undefined
  }): Effect.Effect<number>

  /**
   * Uses the cryptographically secure random generator to shuffle the supplied
   * iterable.
   */
  randomShuffle<A>(elements: Iterable<A>): Effect.Effect<Array<A>>

  /**
   * Generates a cryptographically secure UUIDv4.
   *
   * **Details**
   *
   * The default `"hex"` format returns a lowercase, hyphenated UUID string
   * (36 characters), not a bare hexadecimal string. The `"bytes"` format
   * returns the 16 UUID bytes, including the version and variant bits.
   */
  randomUUIDv4(options?: {
    readonly format?: "hex" | undefined
  }): Effect.Effect<string, PlatformError.PlatformError>
  randomUUIDv4<Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, PlatformError.PlatformError>
  randomUUIDv4(options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, PlatformError.PlatformError>

  /**
   * Generates a cryptographically secure UUIDv7 using the `Clock` timestamp.
   *
   * **Details**
   *
   * The default `"hex"` format returns a lowercase, hyphenated UUID string
   * (36 characters), not a bare hexadecimal string. The `"bytes"` format
   * returns the 16 UUID bytes, including the timestamp, version and variant bits.
   */
  randomUUIDv7(options?: {
    readonly format?: "hex" | undefined
  }): Effect.Effect<string, PlatformError.PlatformError>
  randomUUIDv7<Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, PlatformError.PlatformError>
  randomUUIDv7(options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, PlatformError.PlatformError>

  /**
   * Generates a cryptographically secure ULID string.
   *
   * **Details**
   *
   * ULIDs contain 26 uppercase Crockford base32 characters. The first 10 encode
   * the `Clock` timestamp in milliseconds; the remaining 16 encode 80 random
   * bits. ULIDs sort by timestamp, with no ordering guarantee within the same
   * millisecond.
   *
   * Timestamp normalization matches UUIDv7: fractions are truncated, values are
   * clamped to the 48-bit range, and `NaN` encodes as zero.
   */
  readonly randomULID: Effect.Effect<string, PlatformError.PlatformError>
}

/**
 * Service tag for platform cryptography.
 *
 * **When to use**
 *
 * Use when you need to provide or retrieve the full platform cryptography
 * service from an effect's context.
 *
 * **Details**
 *
 * Providing this service supplies platform-agnostic cryptographic operations
 * such as hashing, UUID generation, and secure random values.
 *
 * @see {@link make} for constructing a Crypto service from primitive operations
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const Crypto: Context.Service<Crypto, Crypto> = Context.Service("effect/Crypto")

/**
 * Generates cryptographically secure random bytes using the Crypto service.
 *
 * **Gotchas**
 *
 * The size must be a non-negative safe integer. Invalid sizes and platform
 * failures are reported as `PlatformError`.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomBytes = (size: number): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.randomBytes(size))

/**
 * Computes a message digest using the Crypto service.
 *
 * **Gotchas**
 *
 * MD5 is unavailable in the browser implementation. MD5 and SHA-1 are
 * intended for interoperability with existing protocols.
 *
 * @category hashing
 * @since 4.1.0
 */
export const digest = (
  algorithm: DigestAlgorithm,
  data: Uint8Array
): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.digest(algorithm, data))

/**
 * Generates a cryptographically secure number between zero, inclusive, and one,
 * exclusive, using the Crypto service.
 *
 * @category generators
 * @since 4.1.0
 */
export const random: Effect.Effect<number, never, Crypto> = Effect.flatMap(Crypto, (crypto) => crypto.random)

/**
 * Generates a cryptographically secure boolean with equal probability for both
 * values using the Crypto service.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomBoolean: Effect.Effect<boolean, never, Crypto> = Effect.flatMap(
  Crypto,
  (crypto) => crypto.randomBoolean
)

/**
 * Generates a cryptographically secure integer across the full safe-integer
 * range using the Crypto service.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomInt: Effect.Effect<number, never, Crypto> = Effect.flatMap(Crypto, (crypto) => crypto.randomInt)

/**
 * Generates a cryptographically secure number between `min`, inclusive, and
 * `max`, exclusive, using the Crypto service.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomBetween = (min: number, max: number): Effect.Effect<number, never, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.randomBetween(min, max))

/**
 * Generates a uniformly distributed cryptographically secure integer between
 * `min` and `max` using the Crypto service.
 *
 * **Details**
 *
 * The lower bound is rounded up and the upper bound is rounded down. Both
 * bounds are inclusive unless `options.halfOpen` excludes the upper bound.
 *
 * **Gotchas**
 *
 * Empty ranges and bounds that do not round to safe integers die with
 * `RangeError` when the service is constructed with `make`.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomIntBetween = (min: number, max: number, options?: {
  readonly halfOpen?: boolean | undefined
}): Effect.Effect<number, never, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.randomIntBetween(min, max, options))

/**
 * Shuffles an iterable using cryptographically secure random choices from the
 * Crypto service.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomShuffle = <A>(elements: Iterable<A>): Effect.Effect<Array<A>, never, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.randomShuffle(elements))

/**
 * Generates a cryptographically secure UUIDv4 using the Crypto service.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomUUIDv4: Effect.Effect<string, PlatformError.PlatformError, Crypto> = Effect.flatMap(
  Crypto,
  (crypto) => crypto.randomUUIDv4
)

/**
 * Generates a cryptographically secure UUIDv7 using the Crypto service and the
 * current Clock timestamp.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomUUIDv7: Effect.Effect<string, PlatformError.PlatformError, Crypto> = Effect.flatMap(
  Crypto,
  (crypto) => crypto.randomUUIDv7
)

/**
 * Generates a cryptographically secure ULID using the Crypto service and the
 * current Clock timestamp.
 *
 * **Details**
 *
 * The result contains 26 uppercase Crockford base32 characters. ULIDs sort by
 * timestamp, with no ordering guarantee within the same millisecond.
 *
 * @category generators
 * @since 4.1.0
 */
export const randomULID: Effect.Effect<string, PlatformError.PlatformError, Crypto> = Effect.flatMap(
  Crypto,
  (crypto) => crypto.randomULID
)

/**
 * Computes an HMAC using the Crypto service's message authentication capability.
 *
 * **Gotchas**
 *
 * Fails with `PlatformError` if the platform rejects the key or algorithm.
 * SHA-1 is available for legacy protocol compatibility.
 *
 * @category hashing
 * @since 4.1.0
 */
export const hmac = (
  algorithm: HmacAlgorithm,
  key: Uint8Array,
  data: Uint8Array
): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.hmac(algorithm, key, data))

/**
 * Derives a password key using the Crypto service's PBKDF2 capability.
 *
 * **Details**
 *
 * The output length is measured in bytes. `make` validates that iterations and
 * length are positive safe integers before calling the platform primitive.
 *
 * **Gotchas**
 *
 * Fails with `PlatformError` if the platform rejects the request. Platform
 * limits may be lower than JavaScript's safe integer limit.
 * Interruption stops waiting for the result; native key derivation may continue.
 *
 * @category hashing
 * @since 4.1.0
 */
export const pbkdf2 = (
  algorithm: HmacAlgorithm,
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  length: number
): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.pbkdf2(algorithm, password, salt, iterations, length))

/**
 * Encrypts data with the Crypto service's RSA-OAEP public-key capability.
 *
 * **Gotchas**
 *
 * Encryption fails with `PlatformError` if the public key is invalid or the
 * plaintext exceeds the key's OAEP payload limit. Ciphertext is randomized; use
 * the matching private key and hash to decrypt it. Public keys must come from a
 * trusted source.
 *
 * @category encryption
 * @since 4.1.0
 */
export const rsaOaepEncrypt = (
  options: RsaOaepOptions
): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.rsaOaepEncrypt(options))

/**
 * Generates an AES-GCM or HMAC key using the Crypto service.
 *
 * **Details**
 *
 * Keys default to non-extractable with all usages supported by their algorithm.
 *
 * @category key management
 * @since 4.1.0
 */
export const generateSecretKey = (
  algorithm: SecretKeyAlgorithm,
  options?: KeyOptions
): Effect.Effect<Key, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.generateSecretKey(algorithm, options))

/**
 * Generates an RSA, ECDSA, or Ed25519 key pair using the Crypto service.
 *
 * **Details**
 *
 * Private keys default to non-extractable. Public keys remain extractable.
 * RSA generation requires a modulus of at least 2048 bits.
 *
 * @category key management
 * @since 4.1.0
 */
export const generateKeyPair = (
  algorithm: KeyPairAlgorithm,
  options?: KeyOptions
): Effect.Effect<KeyPair, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.generateKeyPair(algorithm, options))

/**
 * Imports raw secret keys, DER SPKI public keys, or DER PKCS8 private keys using
 * the Crypto service.
 *
 * **Gotchas**
 *
 * The format and algorithm must match the key material. Imported secret and
 * private keys default to non-extractable. Public keys default to extractable,
 * and the native backend enforces usages.
 *
 * @category key management
 * @since 4.1.0
 */
export const importKey = (
  format: KeyFormat,
  data: Uint8Array,
  algorithm: KeyAlgorithm,
  options?: KeyOptions
): Effect.Effect<Key, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.importKey(format, data, algorithm, options))

/**
 * Exports an extractable key in raw, DER SPKI, or DER PKCS8 format using the
 * Crypto service.
 *
 * **Gotchas**
 *
 * Exported secret and private key bytes are unencrypted sensitive material.
 * Non-extractable keys fail with `PlatformError`.
 *
 * @category key management
 * @since 4.1.0
 */
export const exportKey = (
  format: KeyFormat,
  key: Key
): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.exportKey(format, key))

/**
 * Encrypts data with an AES-GCM secret key or RSA-OAEP public key using the
 * Crypto service.
 *
 * **Gotchas**
 *
 * AES-GCM requires a fresh 12-byte IV for each encryption with the same key.
 * Its ciphertext includes the 16-byte authentication tag. The key must permit
 * encryption and match the selected algorithm.
 *
 * @category encryption
 * @since 4.1.0
 */
export const encrypt = (
  options: CipherOptions,
  key: Key,
  data: Uint8Array
): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.encrypt(options, key, data))

/**
 * Decrypts AES-GCM or RSA-OAEP ciphertext using the Crypto service.
 *
 * **Gotchas**
 *
 * AES-GCM authentication failures fail with `PlatformError` without returning
 * plaintext. The key must permit decryption and match the selected algorithm.
 *
 * @category encryption
 * @since 4.1.0
 */
export const decrypt = (
  options: CipherOptions,
  key: Key,
  data: Uint8Array
): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.decrypt(options, key, data))

/**
 * Computes an HMAC or signs data with RSA-PSS, ECDSA, or Ed25519 using the
 * Crypto service.
 *
 * **Details**
 *
 * ECDSA signatures use IEEE P1363 encoding. RSA-PSS salt lengths default to
 * the key hash's output size. The key must permit signing.
 *
 * @category signing
 * @since 4.1.0
 */
export const sign = (
  options: SigningOptions,
  key: Key,
  data: Uint8Array
): Effect.Effect<Uint8Array, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.sign(options, key, data))

/**
 * Verifies an HMAC, RSA-PSS, ECDSA, or Ed25519 signature using the Crypto service.
 *
 * **Details**
 *
 * Signature mismatches return `false`. Invalid keys, disallowed usages, and
 * rejected parameters fail with `PlatformError`.
 *
 * @category signing
 * @since 4.1.0
 */
export const verify = (
  options: SigningOptions,
  key: Key,
  signature: Uint8Array,
  data: Uint8Array
): Effect.Effect<boolean, PlatformError.PlatformError, Crypto> =>
  Effect.flatMap(Crypto, (crypto) => crypto.verify(options, key, signature, data))

/**
 * Creates a `Crypto` service from the primitive implementation, deriving the
 * random generator helpers and UUID generation from those primitives.
 *
 * **When to use**
 *
 * Use to build a Crypto service for a platform integration, test layer, or
 * custom runtime from secure randomness and native cryptographic operations.
 *
 * **Details**
 *
 * The constructor derives random numbers, booleans, integer ranges, shuffling,
 * and UUID generation from `impl.randomBytes`. Cryptographic operations and
 * key management delegate to the supplied platform functions.
 *
 * **Gotchas**
 *
 * `impl.randomBytes` must return cryptographically secure bytes of the
 * requested length. UUID formatting mutates the byte array returned for UUID
 * generation, so the implementation should return a fresh array for each call.
 *
 * **Example** (Creating a Crypto service)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect } from "effect"
 *
 * const testCrypto = Crypto.make({
 *   ...Crypto.makeSubtle(globalThis.crypto.subtle),
 *   randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size))
 * })
 *
 * const bytes = await Effect.runPromise(testCrypto.randomBytes(4))
 * bytes.length // => 4
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  impl: {
    readonly randomBytes: (size: number) => Uint8Array
    readonly digest: (
      algorithm: DigestAlgorithm,
      data: Uint8Array
    ) => Effect.Effect<Uint8Array, PlatformError.PlatformError>
    readonly hmac: Crypto["hmac"]
    readonly pbkdf2: Crypto["pbkdf2"]
    readonly rsaOaepEncrypt: Crypto["rsaOaepEncrypt"]
    readonly generateSecretKey: Crypto["generateSecretKey"]
    readonly generateKeyPair: Crypto["generateKeyPair"]
    readonly importKey: Crypto["importKey"]
    readonly exportKey: Crypto["exportKey"]
    readonly encrypt: Crypto["encrypt"]
    readonly decrypt: Crypto["decrypt"]
    readonly sign: Crypto["sign"]
    readonly verify: Crypto["verify"]
  }
): Crypto => {
  const randomBytesUnsafe = impl.randomBytes

  const tryRandom = <A>(method: string, f: () => A): Effect.Effect<A, PlatformError.PlatformError> =>
    Effect.try({
      try: f,
      catch: (cause) =>
        PlatformError.isPlatformError(cause) ? cause : PlatformError.systemError({
          module: "Crypto",
          method,
          _tag: "Unknown",
          description: "Could not generate secure random bytes",
          cause
        })
    })

  const randomBytes: Crypto["randomBytes"] = (size) =>
    Effect.flatMap(validateSize("randomBytes", size), () => tryRandom("randomBytes", () => randomBytesUnsafe(size)))

  const readUint53 = (bytes: Uint8Array): number =>
    ((bytes[0] & 0x1f) * 2 ** 48) + (bytes[1] * 2 ** 40) + (bytes[2] * 2 ** 32) +
    (bytes[3] * 2 ** 24) + (bytes[4] * 2 ** 16) + (bytes[5] * 2 ** 8) + bytes[6]

  const nextDoubleUnsafe = (): number => readUint53(randomBytesUnsafe(7)) / 2 ** 53

  const nextIntUnsafe = (): number => {
    while (true) {
      const bytes = randomBytesUnsafe(7)
      const value = readUint53(bytes)
      if ((bytes[0] & 0x20) === 0) {
        return value + Number.MIN_SAFE_INTEGER
      }
      if (value < Number.MAX_SAFE_INTEGER) {
        return value + 1
      }
    }
  }

  const nextIntBetweenUnsafe = (min: number, max: number, halfOpen = false): number => {
    const minInt = Math.ceil(min)
    const maxInt = Math.floor(max)
    if (!Number.isSafeInteger(minInt) || !Number.isSafeInteger(maxInt)) {
      throw new RangeError("bounds must round to safe integers")
    }
    const lower = BigInt(minInt)
    const count = BigInt(maxInt) - lower + (halfOpen ? BigInt("0") : BigInt("1"))
    if (count <= BigInt("0")) {
      throw new RangeError("range must contain at least one integer")
    }
    if (count === BigInt("1")) return minInt
    // Use 54 bits only for ranges wider than a 53-bit draw. BigInt keeps
    // every integer distinct when the range crosses the safe-integer domain.
    const wide = count > (BigInt("1") << BigInt("53"))
    const total = BigInt("1") << (wide ? BigInt("54") : BigInt("53"))
    const bucketSize = total / count
    const limit = bucketSize * count
    while (true) {
      const bytes = randomBytesUnsafe(7)
      const draw = BigInt(readUint53(bytes)) +
        (wide && (bytes[0] & 0x20) !== 0 ? BigInt("1") << BigInt("53") : BigInt("0"))
      if (draw < limit) return Number(lower + draw / bucketSize)
    }
  }

  return Crypto.of({
    [TypeId]: TypeId,
    randomBytes,
    nextDoubleUnsafe,
    nextIntUnsafe,
    digest: impl.digest,
    hmac: impl.hmac,
    rsaOaepEncrypt: impl.rsaOaepEncrypt,
    generateSecretKey: impl.generateSecretKey,
    generateKeyPair: impl.generateKeyPair,
    importKey: impl.importKey,
    exportKey: impl.exportKey,
    encrypt: impl.encrypt,
    decrypt: impl.decrypt,
    sign: impl.sign,
    verify: impl.verify,
    pbkdf2: (algorithm, password, salt, iterations, length) => {
      if (!Number.isSafeInteger(iterations) || iterations <= 0 || !Number.isSafeInteger(length) || length <= 0) {
        return Effect.fail(PlatformError.badArgument({
          module: "Crypto",
          method: "pbkdf2",
          description: "iterations and length must be positive safe integers"
        }))
      }
      return impl.pbkdf2(algorithm, password, salt, iterations, length)
    },
    random: Effect.sync(() => nextDoubleUnsafe()),
    randomBoolean: Effect.sync(() => nextDoubleUnsafe() >= 0.5),
    randomInt: Effect.sync(() => nextIntUnsafe()),
    randomBetween: (min, max) =>
      Effect.sync(() => {
        const draw = nextDoubleUnsafe()
        return Number.isFinite(min) && Number.isFinite(max) && !Number.isFinite(max - min)
          ? min * (1 - draw) + max * draw
          : internalRandom.nextBetween(min, max, draw)
      }),
    randomIntBetween: (min, max, options) => Effect.sync(() => nextIntBetweenUnsafe(min, max, options?.halfOpen)),
    randomShuffle: (elements) =>
      Effect.sync(() => {
        const buffer = Array.from(elements)
        for (let i = buffer.length - 1; i >= 1; i = i - 1) {
          const index = nextIntBetweenUnsafe(0, i)
          const value = buffer[i]!
          buffer[i] = buffer[index]!
          buffer[index] = value
        }
        return buffer
      }),
    randomUUIDv4: ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
      tryRandom("randomUUIDv4", () => {
        const bytes = Uuid.v4Bytes(randomBytesUnsafe(16))
        return options?.format === "bytes" ? bytes : Uuid.stringify(bytes)
      })) as Crypto["randomUUIDv4"],
    randomUUIDv7: ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
      Effect.clockWith((clock) =>
        tryRandom("randomUUIDv7", () => {
          const bytes = Uuid.v7Bytes(clock.currentTimeMillisUnsafe(), randomBytesUnsafe(16))
          return options?.format === "bytes" ? bytes : Uuid.stringify(bytes)
        })
      )) as Crypto["randomUUIDv7"],
    randomULID: Effect.clockWith((clock) =>
      tryRandom("randomULID", () => Ulid.ulidString(clock.currentTimeMillisUnsafe(), randomBytesUnsafe(10)))
    )
  })
}

const validateSize = (method: string, size: number): Effect.Effect<number, PlatformError.PlatformError> =>
  Number.isSafeInteger(size) && size >= 0
    ? Effect.succeed(size)
    : Effect.fail(PlatformError.badArgument({
      module: "Crypto",
      method,
      description: "size must be a non-negative safe integer"
    }))

const nativeKeys = new WeakMap<SubtleCrypto, WeakMap<Key, CryptoKey>>()
const hashLengths: Record<HmacAlgorithm, number> = { "SHA-1": 20, "SHA-256": 32, "SHA-384": 48, "SHA-512": 64 }

/**
 * Creates cryptographic operation implementations from an explicitly supplied
 * native SubtleCrypto backend for use with `make`.
 *
 * **When to use**
 *
 * Use to implement a platform Crypto service with native hashing, key
 * management, authenticated encryption, and signing operations.
 *
 * **Details**
 *
 * This constructor does not read a global cryptography API. Supply secure
 * `randomBytes` separately to `make`. Runtime adapters can override individual
 * operations, including MD5 digests unavailable in SubtleCrypto.
 *
 * **Gotchas**
 *
 * Algorithm availability depends on the supplied backend. Unsupported
 * operations fail with `PlatformError`. Keys can be reused by service instances
 * sharing the same backend, and their native handles remain private.
 *
 * **Example** (Encrypting authenticated data)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect } from "effect"
 *
 * const service = Crypto.make({
 *   ...Crypto.makeSubtle(globalThis.crypto.subtle),
 *   randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size))
 * })
 * const program = Effect.gen(function*() {
 *   const key = yield* Crypto.generateSecretKey({ name: "AES-GCM", length: 256 })
 *   const iv = yield* Crypto.randomBytes(12)
 *   const options: Crypto.CipherOptions = {
 *     name: "AES-GCM", iv, additionalData: new TextEncoder().encode("record:42")
 *   }
 *   const ciphertext = yield* Crypto.encrypt(options, key, new TextEncoder().encode("secret"))
 *   const plaintext = yield* Crypto.decrypt(options, key, ciphertext)
 *   return new TextDecoder().decode(plaintext)
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provideService(Crypto.Crypto, service))) // => "secret"
 * ```
 *
 * @see {@link make}
 *
 * @category constructors
 * @since 4.1.0
 */
export const makeSubtle = (subtle: SubtleCrypto): Omit<Parameters<typeof make>[0], "randomBytes"> => {
  const handles = nativeKeys.get(subtle) ?? new WeakMap<Key, CryptoKey>()
  if (subtle) nativeKeys.set(subtle, handles)

  const run = <A>(method: string, f: () => Promise<A>): Effect.Effect<A, PlatformError.PlatformError> =>
    Effect.tryPromise({
      try: f,
      catch: (cause) =>
        PlatformError.isPlatformError(cause) ? cause : PlatformError.systemError({
          module: "Crypto",
          method,
          _tag: "Unknown",
          description: `Could not perform ${method}`,
          cause
        })
    })

  const badArgument = (method: string, description: string): never => {
    throw PlatformError.badArgument({ module: "Crypto", method, description })
  }

  const wrap = (handle: CryptoKey): Key => {
    const native = handle.algorithm as AesKeyAlgorithm & HmacKeyAlgorithm & RsaHashedKeyAlgorithm & EcKeyAlgorithm
    let algorithm: KeyAlgorithm
    switch (native.name) {
      case "AES-GCM":
        algorithm = { name: "AES-GCM", length: native.length as 128 | 192 | 256 }
        break
      case "HMAC":
        algorithm = { name: "HMAC", hash: native.hash.name as HmacAlgorithm, length: native.length }
        break
      case "RSA-OAEP":
      case "RSA-PSS":
        algorithm = {
          name: native.name,
          hash: native.hash.name as HmacAlgorithm,
          modulusLength: native.modulusLength,
          publicExponent: new Uint8Array(native.publicExponent)
        }
        break
      case "ECDSA":
        algorithm = { name: "ECDSA", namedCurve: native.namedCurve as NamedCurve }
        break
      default:
        algorithm = { name: "Ed25519" }
    }
    const key: Key = Object.freeze({
      "~effect/Crypto/Key": "~effect/Crypto/Key" as const,
      type: handle.type,
      algorithm: Object.freeze(algorithm),
      extractable: handle.extractable,
      usages: Object.freeze(Array.from(handle.usages) as Array<KeyUsage>)
    })
    handles.set(key, handle)
    return key
  }

  const getKey = (method: string, key: Key): CryptoKey => {
    const handle = handles.get(key)
    return handle ?? badArgument(method, "key does not belong to this cryptographic backend")
  }

  const algorithmParams = (method: string, algorithm: KeyAlgorithm, generating: boolean): AlgorithmIdentifier => {
    switch (algorithm.name) {
      case "AES-GCM":
        return { name: algorithm.name, length: algorithm.length } as AesKeyGenParams
      case "HMAC": {
        const length = algorithm.length
        if (
          length !== undefined &&
          (!Number.isSafeInteger(length) || length <= 0 || length > 0xffff_ffff || length % 8 !== 0)
        ) {
          return badArgument(method, "HMAC key length must be a positive multiple of 8 bits below 2^32")
        }
        return {
          name: algorithm.name,
          hash: algorithm.hash,
          ...(length === undefined ? {} : { length })
        } as HmacKeyGenParams
      }
      case "RSA-OAEP":
      case "RSA-PSS": {
        const modulusLength = algorithm.modulusLength ?? 2048
        if (
          generating &&
          (!Number.isSafeInteger(modulusLength) || modulusLength < 2048 || modulusLength > 0xffff_ffff ||
            modulusLength % 8 !== 0)
        ) {
          return badArgument(
            method,
            "RSA modulus length must be a multiple of 8 bits, at least 2048 bits, and below 2^32"
          )
        }
        return generating
          ? {
            name: algorithm.name,
            hash: algorithm.hash,
            modulusLength,
            publicExponent: new Uint8Array(algorithm.publicExponent ?? [1, 0, 1])
          } as RsaHashedKeyGenParams
          : { name: algorithm.name, hash: algorithm.hash } as RsaHashedImportParams
      }
      case "ECDSA":
        return { name: algorithm.name, namedCurve: algorithm.namedCurve } as EcKeyGenParams
      case "Ed25519":
        return { name: algorithm.name }
    }
  }

  const usagesFor = (algorithm: KeyAlgorithm, type?: Key["type"]): Array<KeyUsage> => {
    if (algorithm.name === "AES-GCM" || algorithm.name === "RSA-OAEP") {
      return type === "public" ? ["encrypt"] : type === "private" ? ["decrypt"] : ["encrypt", "decrypt"]
    }
    return type === "public" ? ["verify"] : type === "private" ? ["sign"] : ["sign", "verify"]
  }

  const cipherParams = (method: string, options: CipherOptions): AlgorithmIdentifier => {
    if (options.name === "AES-GCM") {
      if (options.iv.length !== 12) return badArgument(method, "AES-GCM IV must contain exactly 12 bytes")
      return {
        name: options.name,
        iv: new Uint8Array(options.iv),
        tagLength: 128,
        ...(options.additionalData === undefined ? {} : { additionalData: new Uint8Array(options.additionalData) })
      } as AesGcmParams
    }
    return {
      name: options.name,
      ...(options.label === undefined ? {} : { label: new Uint8Array(options.label) })
    } as RsaOaepParams
  }

  const signingParams = (method: string, options: SigningOptions, key: CryptoKey): AlgorithmIdentifier => {
    if (options.name === "ECDSA") return { name: options.name, hash: options.hash } as EcdsaParams
    if (options.name === "RSA-PSS") {
      const hash = (key.algorithm as RsaHashedKeyAlgorithm).hash?.name as HmacAlgorithm
      const saltLength = options.saltLength ?? hashLengths[hash]
      if (!Number.isSafeInteger(saltLength) || saltLength < 0 || saltLength > 0xffff_ffff) {
        return badArgument(method, "RSA-PSS salt length must be a non-negative 32-bit integer")
      }
      return { name: options.name, saltLength } as RsaPssParams
    }
    return { name: options.name }
  }

  return {
    digest: (algorithm, data) =>
      run("digest", async () => new Uint8Array(await subtle.digest(algorithm, new Uint8Array(data)))),
    hmac: (algorithm, key, data) =>
      run("hmac", async () => {
        // HMAC zero-padding makes an empty key equivalent to one zero byte.
        const ownedKey = key.length === 0 ? new Uint8Array(1) : new Uint8Array(key)
        const ownedData = new Uint8Array(data)
        const handle = await subtle.importKey("raw", ownedKey, { name: "HMAC", hash: algorithm }, false, ["sign"])
        return new Uint8Array(await subtle.sign("HMAC", handle, ownedData))
      }),
    pbkdf2: (algorithm, password, salt, iterations, length) =>
      run("pbkdf2", async () => {
        const ownedPassword = new Uint8Array(password)
        const ownedSalt = new Uint8Array(salt)
        const handle = await subtle.importKey("raw", ownedPassword, "PBKDF2", false, ["deriveBits"])
        return new Uint8Array(
          await subtle.deriveBits({ name: "PBKDF2", hash: algorithm, salt: ownedSalt, iterations }, handle, length * 8)
        )
      }),
    rsaOaepEncrypt: (options) =>
      run("rsaOaepEncrypt", async () => {
        const ownedKey = new Uint8Array(options.publicKey)
        const ownedData = new Uint8Array(options.data)
        const ownedLabel = options.label === undefined ? undefined : new Uint8Array(options.label)
        const handle = await subtle.importKey(
          "spki",
          ownedKey,
          { name: "RSA-OAEP", hash: options.hash ?? "SHA-256" },
          false,
          ["encrypt"]
        )
        return new Uint8Array(
          await subtle.encrypt(
            { name: "RSA-OAEP", ...(ownedLabel === undefined ? {} : { label: ownedLabel }) },
            handle,
            ownedData
          )
        )
      }),
    generateSecretKey: (algorithm, options) =>
      run("generateSecretKey", async () => {
        const handle = await subtle.generateKey(
          algorithmParams("generateSecretKey", algorithm, true),
          options?.extractable ?? false,
          Array.from(options?.usages ?? usagesFor(algorithm))
        )
        return wrap(handle as CryptoKey)
      }),
    generateKeyPair: (algorithm, options) =>
      run("generateKeyPair", async () => {
        const pair = await subtle.generateKey(
          algorithmParams("generateKeyPair", algorithm, true),
          options?.extractable ?? false,
          Array.from(options?.usages ?? usagesFor(algorithm))
        ) as CryptoKeyPair
        return { publicKey: wrap(pair.publicKey), privateKey: wrap(pair.privateKey) }
      }),
    importKey: (format, data, algorithm, options) =>
      run("importKey", async () => {
        const type = format === "spki" ? "public" : format === "pkcs8" ? "private" : "secret"
        const secret = algorithm.name === "AES-GCM" || algorithm.name === "HMAC"
        if ((type === "secret") !== secret) {
          return badArgument(
            "importKey",
            "raw format requires a secret key algorithm; SPKI and PKCS8 require an asymmetric algorithm"
          )
        }
        if (format === "raw" && data.length === 0) {
          return badArgument("importKey", "secret key material must not be empty")
        }
        const handle = await subtle.importKey(
          format,
          new Uint8Array(data),
          algorithmParams("importKey", algorithm, false),
          options?.extractable ?? (type === "public"),
          Array.from(options?.usages ?? usagesFor(algorithm, type))
        )
        if (algorithm.name === "AES-GCM" && (handle.algorithm as AesKeyAlgorithm).length !== algorithm.length) {
          return badArgument("importKey", "AES key length does not match the requested algorithm")
        }
        return wrap(handle)
      }),
    exportKey: (format, key) =>
      run("exportKey", async () => {
        const handle = getKey("exportKey", key)
        const formatForType = { secret: "raw", public: "spki", private: "pkcs8" }
        if (format !== formatForType[handle.type]) {
          return badArgument("exportKey", "format does not match the key type")
        }
        return new Uint8Array(await subtle.exportKey(format, handle))
      }),
    encrypt: (options, key, data) =>
      run(
        "encrypt",
        async () =>
          new Uint8Array(
            await subtle.encrypt(cipherParams("encrypt", options), getKey("encrypt", key), new Uint8Array(data))
          )
      ),
    decrypt: (options, key, data) =>
      run(
        "decrypt",
        async () =>
          new Uint8Array(
            await subtle.decrypt(cipherParams("decrypt", options), getKey("decrypt", key), new Uint8Array(data))
          )
      ),
    sign: (options, key, data) =>
      run("sign", async () => {
        const handle = getKey("sign", key)
        return new Uint8Array(await subtle.sign(signingParams("sign", options, handle), handle, new Uint8Array(data)))
      }),
    verify: (options, key, signature, data) =>
      run("verify", () => {
        const handle = getKey("verify", key)
        return subtle.verify(
          signingParams("verify", options, handle),
          handle,
          new Uint8Array(signature),
          new Uint8Array(data)
        )
      })
  }
}
