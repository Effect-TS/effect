/**
 * Cryptography: hashing, message authentication, encryption, key derivation,
 * password hashing, signatures, key agreement, and secure randomness.
 *
 * Each algorithm family is a separate service, such as {@link Aes},
 * {@link Ed25519}, {@link Rsa}, or {@link Sha2}, so a program's requirements
 * show which algorithms it uses, and a platform can only satisfy them when it
 * implements them. Services implemented by Web Crypto have a layer here, such
 * as {@link layerAes}, that runs on the {@link SubtleCrypto} reference and
 * needs nothing else; provide only the layers a program uses. The platform
 * packages add what Web Crypto lacks: MD5, ChaCha20-Poly1305,
 * XChaCha20-Poly1305, and Argon2id.
 *
 * Secret keys are `Redacted` bytes. Asymmetric keys have a type per key
 * family, such as {@link Ed25519PrivateKey} or {@link RsaPublicKey}: private
 * keys are `Redacted` PKCS8 bytes, and public keys are the algorithm's raw
 * encoding, or SPKI for RSA. Functions such as {@link ed25519PrivateKeyFromPkcs8}
 * and {@link rsaPublicKeyFromJwk} create keys from PKCS8, SPKI, and JSON Web
 * Keys. Failures are {@link CryptoError}s whose reason says what went wrong.
 *
 * Operations read their inputs while they run, without copying them, so do
 * not modify an input until its operation completes.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Brand from "./Brand.ts"
import * as Context from "./Context.ts"
import * as Data from "./Data.ts"
import * as Effect from "./Effect.ts"
import * as internalRandom from "./internal/random.ts"
import * as Ulid from "./internal/ulid.ts"
import * as Uuid from "./internal/uuid.ts"
import * as Layer from "./Layer.ts"
import * as Predicate from "./Predicate.ts"
import * as Redacted from "./Redacted.ts"

// =============================================================================
// Errors
// =============================================================================

const CryptoErrorTypeId = "~effect/Crypto/CryptoError" as const

/**
 * Reason for an argument that the operation rejects before using the key or
 * data, such as a wrong nonce length or an out-of-range iteration count.
 *
 * **Details**
 *
 * Also used when a key is not permitted for the operation, belongs to another
 * backend, or does not match the requested format.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class BadArgument extends Data.TaggedError("BadArgument")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Reason for key material that the backend rejects, such as malformed DER or
 * JWK data, a wrong key length, or a peer public key that produces an invalid
 * shared secret.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class InvalidKey extends Data.TaggedError("InvalidKey")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Reason for ciphertext that fails authentication or integrity checks during
 * decryption.
 *
 * **Details**
 *
 * No plaintext is returned. The reason does not reveal whether the key,
 * nonce, additional data, label, or ciphertext was wrong.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class AuthenticationFailed extends Data.TaggedError("AuthenticationFailed")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Reason for an algorithm or parameter that the host runtime does not
 * implement, such as a curve missing from an older Web Crypto implementation.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class Unsupported extends Data.TaggedError("Unsupported")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Reason for an unexpected failure reported by the cryptographic backend.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class Unknown extends Data.TaggedError("Unknown")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Union of the reasons carried by `CryptoError`.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export type CryptoErrorReason = BadArgument | InvalidKey | AuthenticationFailed | Unsupported | Unknown

/**
 * Error returned by cryptographic services.
 *
 * **When to use**
 *
 * Use to handle failures from any `Crypto` service, matching on
 * `reason` to separate caller mistakes from authentication failures.
 *
 * **Details**
 *
 * `algorithm` names the algorithm, such as `"AES-GCM"`, and `method` names
 * the operation, such as `"decrypt"`.
 *
 * **Example** (Recovering from failed authentication)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect } from "effect"
 *
 * const decrypt = Effect.fail(
 *   new Crypto.CryptoError({
 *     algorithm: "AES-GCM",
 *     method: "decrypt",
 *     reason: new Crypto.AuthenticationFailed({ description: "Could not authenticate data" })
 *   })
 * )
 *
 * const program = decrypt.pipe(
 *   Effect.catchReason("CryptoError", "AuthenticationFailed", () => Effect.succeed("rejected"))
 * )
 *
 * await Effect.runPromise(program) // => "rejected"
 * ```
 *
 * @see {@link isCryptoError} for narrowing unknown values
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class CryptoError extends Data.TaggedError("CryptoError")<{
  readonly algorithm: string
  readonly method: string
  readonly reason: CryptoErrorReason
}> {
  /**
   * Marks this value as a cryptographic error for runtime guards.
   *
   * @since 4.0.0
   */
  readonly [CryptoErrorTypeId]: typeof CryptoErrorTypeId = CryptoErrorTypeId

  /**
   * Exposes the reason as the error cause.
   *
   * @since 4.0.0
   */
  override readonly cause: CryptoErrorReason = this.reason

  override get message(): string {
    return `${this.algorithm}.${this.method}: ${this.reason._tag}: ${this.reason.message}`
  }
}

/**
 * Checks whether a value is a `CryptoError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isCryptoError = (u: unknown): u is CryptoError => Predicate.hasProperty(u, CryptoErrorTypeId)

// =============================================================================
// Web Crypto
// =============================================================================

/**
 * Reference to the `SubtleCrypto` that the Web Crypto layers run on.
 *
 * **When to use**
 *
 * Use to run the Web Crypto layers on a specific `SubtleCrypto`, such as a
 * polyfill or a test double, by providing it with `Layer.succeed`.
 *
 * **Details**
 *
 * The default is `globalThis.crypto.subtle`, which is `undefined` where the
 * runtime has no Web Crypto.
 *
 * @see {@link subtleCrypto} for reading the reference in a layer
 *
 * @stability unstable
 * @category references
 * @since 4.0.0
 */
export const SubtleCrypto: Context.Reference<globalThis.SubtleCrypto | undefined> = Context.Reference<
  globalThis.SubtleCrypto | undefined
>("effect/Crypto/SubtleCrypto", { defaultValue: () => globalThis.crypto?.subtle })

/**
 * Reads the {@link SubtleCrypto} reference, failing when there is none.
 *
 * **Details**
 *
 * Fails with a `CryptoError` whose reason is `Unsupported` where the runtime
 * has no Web Crypto. The Web Crypto layers read it when they are built, so they
 * fail to build there.
 *
 * **Gotchas**
 *
 * Browsers expose `crypto.subtle` only in secure contexts.
 *
 * @stability unstable
 * @category accessors
 * @since 4.0.0
 */
export const subtleCrypto: Effect.Effect<globalThis.SubtleCrypto, CryptoError> = SubtleCrypto.use((subtle) =>
  subtle === undefined
    ? Effect.fail(
      new CryptoError({
        algorithm: "WebCrypto",
        method: "subtle",
        reason: new Unsupported({
          description: "Web Crypto is unavailable; browsers expose crypto.subtle only in secure contexts"
        })
      })
    )
    : Effect.succeed(subtle)
)

/**
 * Returns `true` for the `OperationError` that Web Crypto raises when an
 * operation fails on valid arguments, such as a decryption whose tag does not
 * match.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isOperationError = (cause: unknown): boolean =>
  Predicate.hasProperty(cause, "name") && cause.name === "OperationError"

/**
 * Creates the `CryptoError` for an exception thrown by Web Crypto.
 *
 * **Details**
 *
 * The reason follows the exception: `DataError` is `InvalidKey`,
 * `NotSupportedError` is `Unsupported`, `InvalidAccessError`, `SyntaxError`,
 * and `TypeError` are `BadArgument`, and anything else, including
 * `OperationError`, is `Unknown`. Handle `OperationError` first where it has a specific meaning,
 * such as `AuthenticationFailed` for decryption.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const webCryptoError = (algorithm: string, method: string, cause: unknown): CryptoError =>
  new CryptoError({ algorithm, method, reason: reasonFor(method, cause) })

const reasonFor = (method: string, cause: unknown): CryptoErrorReason => {
  switch (Predicate.hasProperty(cause, "name") ? cause.name : undefined) {
    case "DataError":
      return new InvalidKey({ description: "Invalid key data", cause })
    case "NotSupportedError":
      return new Unsupported({ description: `${method} does not support the requested parameters`, cause })
    case "InvalidAccessError":
    case "SyntaxError":
      return new BadArgument({
        description: `${method} does not permit the requested key or usages`,
        cause
      })
    case "TypeError":
      return new BadArgument({ description: `${method} does not accept the requested parameters`, cause })
    default:
      return new Unknown({ description: `Could not perform ${method}`, cause })
  }
}

type ImportParams = AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams

const invalidKey = (algorithm: string, method: string, description: string) =>
  Effect.fail(new CryptoError({ algorithm, method, reason: new InvalidKey({ description }) }))

const badArgument = (algorithm: string, method: string, description: string) =>
  Effect.fail(new CryptoError({ algorithm, method, reason: new BadArgument({ description }) }))

const importSecretKey = (
  subtle: SubtleCrypto,
  key: Redacted.Redacted<Uint8Array>,
  params: ImportParams,
  usages: Array<KeyUsage>
): Promise<CryptoKey> => subtle.importKey("raw", Redacted.value(key) as BufferSource, params, false, usages)

// Runs a Web Crypto operation, mapping its exceptions with `webCryptoError`.
const attempt = <A>(algorithm: string, method: string, evaluate: () => Promise<A>): Effect.Effect<A, CryptoError> =>
  Effect.tryPromise({ try: evaluate, catch: (cause) => webCryptoError(algorithm, method, cause) })

// Runs a conversion on the current `SubtleCrypto`.
const convert = <A>(algorithm: string, method: string, evaluate: (subtle: SubtleCrypto) => Promise<A>) =>
  Effect.flatMap(subtleCrypto, (subtle) => attempt(algorithm, method, () => evaluate(subtle)))

type Component = "k" | "x" | "y" | "n" | "e" | "d" | "p" | "q" | "dp" | "dq" | "qi"

// The key material of a JSON Web Key, without the members Web Crypto would
// check against the import parameters, such as `alg`, `use`, `key_ops`, and
// `ext`.
const keyMaterial = (jwk: JsonWebKey, components: ReadonlyArray<Component>): JsonWebKey => {
  const output: JsonWebKey = {}
  if (jwk.kty !== undefined) output.kty = jwk.kty
  if (jwk.crv !== undefined) output.crv = jwk.crv
  for (const name of components) {
    const component = jwk[name]
    if (component !== undefined) output[name] = component
  }
  return output
}

const publicComponents: ReadonlyArray<Component> = ["x", "y", "n", "e"]
const privateComponents: ReadonlyArray<Component> = ["x", "y", "n", "e", "d", "p", "q", "dp", "dq", "qi"]

// Derives the public key of a private key. Web Crypto cannot export it
// directly, so the public members of the private key's JWK export are
// imported as a public key.
const publicKeyOf = async (
  subtle: SubtleCrypto,
  params: ImportParams,
  usage: KeyUsage,
  privateKey: Uint8Array<ArrayBuffer>,
  format: "raw" | "spki"
): Promise<Uint8Array<ArrayBuffer>> => {
  const handle = await subtle.importKey("pkcs8", privateKey, params, true, [usage])
  const jwk = keyMaterial(await subtle.exportKey("jwk", handle), publicComponents)
  const publicKey = await subtle.importKey("jwk", jwk, params, true, [])
  return new Uint8Array(await subtle.exportKey(format, publicKey))
}

const privateKeyFromPkcs8 = <K extends Redacted.Redacted<Uint8Array<ArrayBuffer>>>(
  algorithm: string,
  method: string,
  params: ImportParams,
  usage: KeyUsage,
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
) => {
  const input = (Redacted.isRedacted(pkcs8) ? Redacted.value(pkcs8) : pkcs8) as BufferSource
  return convert(algorithm, method, async (subtle) => {
    const handle = await subtle.importKey("pkcs8", input, params, true, [usage])
    return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as K
  })
}

const privateKeyFromJwk = <K extends Redacted.Redacted<Uint8Array<ArrayBuffer>>>(
  algorithm: string,
  method: string,
  params: ImportParams,
  usage: KeyUsage,
  jwk: JsonWebKey
) => {
  const material = keyMaterial(jwk, privateComponents)
  return convert(algorithm, method, async (subtle) => {
    const handle = await subtle.importKey("jwk", material, params, true, [usage])
    return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as K
  })
}

const publicKeyFromSpki = <K extends Uint8Array<ArrayBuffer>>(
  algorithm: string,
  method: string,
  params: ImportParams,
  format: "raw" | "spki",
  spki: Uint8Array
) =>
  convert(
    algorithm,
    method,
    async (subtle) =>
      new Uint8Array(
        await subtle.exportKey(format, await subtle.importKey("spki", spki as BufferSource, params, true, []))
      ) as K
  )

const publicKeyFromJwk = <K extends Uint8Array<ArrayBuffer>>(
  algorithm: string,
  method: string,
  params: ImportParams,
  format: "raw" | "spki",
  jwk: JsonWebKey
) => {
  const material = keyMaterial(jwk, publicComponents)
  return convert(
    algorithm,
    method,
    async (subtle) =>
      new Uint8Array(await subtle.exportKey(format, await subtle.importKey("jwk", material, params, true, []))) as K
  )
}

const publicKeyToJwk = (
  algorithm: string,
  method: string,
  params: ImportParams,
  format: "raw" | "spki",
  key: Uint8Array<ArrayBuffer>
) =>
  convert(
    algorithm,
    method,
    async (subtle) =>
      keyMaterial(
        await subtle.exportKey("jwk", await subtle.importKey(format, key, params, true, [])),
        publicComponents
      )
  )

const secretKeyFromJwk = (
  algorithm: string,
  method: string,
  params: ImportParams,
  usage: KeyUsage,
  jwk: JsonWebKey
) => {
  const material = keyMaterial(jwk, ["k"])
  return convert(algorithm, method, async (subtle) => {
    const handle = await subtle.importKey("jwk", material, params, true, [usage])
    return Redacted.make(new Uint8Array(await subtle.exportKey("raw", handle)))
  })
}

// =============================================================================
// Secure randomness
// =============================================================================

const SecureRandomTypeId = "~effect/Crypto/SecureRandom"

/**
 * Service that generates cryptographically secure random values.
 *
 * **Details**
 *
 * Implementations supply secure random bytes, and `make` derives every other
 * operation from them. The service is structurally compatible with `Random`.
 *
 * @see {@link makeSecureRandom} for constructing the service from a byte source
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface SecureRandom {
  readonly [SecureRandomTypeId]: typeof SecureRandomTypeId

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
  randomBytes(size: number): Effect.Effect<Uint8Array, CryptoError>

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
  }): Effect.Effect<string, CryptoError>
  randomUUIDv4<Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, CryptoError>
  randomUUIDv4(options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, CryptoError>

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
  }): Effect.Effect<string, CryptoError>
  randomUUIDv7<Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, CryptoError>
  randomUUIDv7(options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, CryptoError>

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
  readonly randomULID: Effect.Effect<string, CryptoError>
}

/**
 * Service tag for cryptographically secure randomness.
 *
 * **When to use**
 *
 * Use to provide or retrieve the secure random generator from an effect's
 * context.
 *
 * @see {@link makeSecureRandom} for constructing the service from a byte source
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const SecureRandom: Context.Service<SecureRandom, SecureRandom> = Context.Service("effect/Crypto/SecureRandom")

/**
 * Generates cryptographically secure random bytes using the SecureRandom
 * service.
 *
 * **Gotchas**
 *
 * The size must be a non-negative safe integer. Invalid sizes fail with a
 * `BadArgument` reason, and random source failures with `Unknown`.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomBytes = (size: number): Effect.Effect<Uint8Array, CryptoError, SecureRandom> =>
  Effect.flatMap(SecureRandom, (random) => random.randomBytes(size))

/**
 * Generates a cryptographically secure number between zero, inclusive, and one,
 * exclusive, using the SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const random: Effect.Effect<number, never, SecureRandom> = Effect.flatMap(SecureRandom, (r) => r.random)

/**
 * Generates a cryptographically secure boolean with equal probability for both
 * values using the SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomBoolean: Effect.Effect<boolean, never, SecureRandom> = Effect.flatMap(
  SecureRandom,
  (r) => r.randomBoolean
)

/**
 * Generates a cryptographically secure integer across the full safe-integer
 * range using the SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomInt: Effect.Effect<number, never, SecureRandom> = Effect.flatMap(SecureRandom, (r) => r.randomInt)

/**
 * Generates a cryptographically secure number between `min`, inclusive, and
 * `max`, exclusive, using the SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomBetween = (min: number, max: number): Effect.Effect<number, never, SecureRandom> =>
  Effect.flatMap(SecureRandom, (r) => r.randomBetween(min, max))

/**
 * Generates a uniformly distributed cryptographically secure integer between
 * `min` and `max` using the SecureRandom service.
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
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomIntBetween = (min: number, max: number, options?: {
  readonly halfOpen?: boolean | undefined
}): Effect.Effect<number, never, SecureRandom> =>
  Effect.flatMap(SecureRandom, (r) => r.randomIntBetween(min, max, options))

/**
 * Shuffles an iterable using cryptographically secure random choices from the
 * SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomShuffle = <A>(elements: Iterable<A>): Effect.Effect<Array<A>, never, SecureRandom> =>
  Effect.flatMap(SecureRandom, (r) => r.randomShuffle(elements))

/**
 * Generates a cryptographically secure UUIDv4 using the SecureRandom service.
 *
 * **Details**
 *
 * The default `"hex"` format returns a lowercase, hyphenated UUID string; the
 * `"bytes"` format returns the 16 UUID bytes.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomUUIDv4: {
  (options?: {
    readonly format?: "hex" | undefined
  }): Effect.Effect<string, CryptoError, SecureRandom>
  <Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, CryptoError, SecureRandom>
  (options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, CryptoError, SecureRandom>
} =
  ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
    Effect.flatMap(SecureRandom, (r) => r.randomUUIDv4(options))) as any

/**
 * Generates a cryptographically secure UUIDv7 using the SecureRandom service
 * and the current Clock timestamp.
 *
 * **Details**
 *
 * The default `"hex"` format returns a lowercase, hyphenated UUID string; the
 * `"bytes"` format returns the 16 UUID bytes.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomUUIDv7: {
  (options?: {
    readonly format?: "hex" | undefined
  }): Effect.Effect<string, CryptoError, SecureRandom>
  <Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, CryptoError, SecureRandom>
  (options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, CryptoError, SecureRandom>
} =
  ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
    Effect.flatMap(SecureRandom, (r) => r.randomUUIDv7(options))) as any

/**
 * Generates a cryptographically secure ULID using the SecureRandom service and
 * the current Clock timestamp.
 *
 * **Details**
 *
 * The result contains 26 uppercase Crockford base32 characters. ULIDs sort by
 * timestamp, with no ordering guarantee within the same millisecond.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomULID: Effect.Effect<string, CryptoError, SecureRandom> = Effect.flatMap(
  SecureRandom,
  (r) => r.randomULID
)

/**
 * Creates a `SecureRandom` service from a secure byte source.
 *
 * **When to use**
 *
 * Use to build a SecureRandom service for a platform integration, test layer,
 * or custom runtime.
 *
 * **Details**
 *
 * Random numbers, booleans, integer ranges, shuffling, UUIDs, and ULIDs are
 * derived from `randomBytes`. Exceptions thrown by `randomBytes` fail with a
 * `CryptoError` whose reason is `Unknown`.
 *
 * **Gotchas**
 *
 * `randomBytes` must return fresh, cryptographically secure bytes of the
 * requested length. UUID formatting mutates the returned array, so each call
 * must return a new array.
 *
 * **Example** (Creating a SecureRandom service)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect } from "effect"
 *
 * const random = Crypto.makeSecureRandom((size) => globalThis.crypto.getRandomValues(new Uint8Array(size)))
 *
 * const bytes = await Effect.runPromise(random.randomBytes(4))
 * bytes.length // => 4
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeSecureRandom = (randomBytesUnsafe: (size: number) => Uint8Array): SecureRandom => {
  const tryRandom = <A>(method: string, f: () => A): Effect.Effect<A, CryptoError> =>
    Effect.try({
      try: f,
      catch: (cause) =>
        new CryptoError({
          algorithm: "SecureRandom",
          method,
          reason: new Unknown({ description: "Could not generate secure random bytes", cause })
        })
    })

  const randomBytes: SecureRandom["randomBytes"] = (size) =>
    Number.isSafeInteger(size) && size >= 0
      ? tryRandom("randomBytes", () => randomBytesUnsafe(size))
      : Effect.fail(
        new CryptoError({
          algorithm: "SecureRandom",
          method: "randomBytes",
          reason: new BadArgument({ description: "size must be a non-negative safe integer" })
        })
      )

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

  // Batch 7-byte draws without consuming extra bytes or retaining randomness
  // across operations. Rejection draws refill one at a time after the batch.
  const makeDrawSource = (expected: number): () => Uint8Array => {
    let bytes: Uint8Array = new Uint8Array(0)
    let offset = 0
    return () => {
      if (offset === bytes.length) {
        bytes = randomBytesUnsafe(7 * Math.max(1, Math.min(expected, 585)))
        offset = 0
      }
      expected--
      offset += 7
      return bytes.subarray(offset - 7, offset)
    }
  }

  const nextIntBetweenUnsafe = (
    min: number,
    max: number,
    halfOpen = false,
    draw: () => Uint8Array = () => randomBytesUnsafe(7)
  ): number => {
    const minInt = Math.ceil(min)
    const maxInt = Math.floor(max)
    if (!Number.isSafeInteger(minInt) || !Number.isSafeInteger(maxInt)) {
      throw new RangeError("bounds must round to safe integers")
    }
    if (maxInt - minInt < Number.MAX_SAFE_INTEGER) {
      // Every intermediate stays below 2^53, and `%` is exact, so the
      // divisions below are exact without BigInt.
      const count = maxInt - minInt + (halfOpen ? 0 : 1)
      if (count <= 0) {
        throw new RangeError("range must contain at least one integer")
      }
      // `+ 0` turns `Math.ceil` of a value in (-1, 0) into 0 instead of -0.
      if (count === 1) return minInt + 0
      const bucketSize = (2 ** 53 - (2 ** 53 % count)) / count
      const limit = bucketSize * count
      while (true) {
        const value = readUint53(draw())
        if (value < limit) return minInt + (value - (value % bucketSize)) / bucketSize
      }
    }
    // Use 54 bits only for ranges wider than a 53-bit draw. BigInt keeps
    // every integer distinct when the range crosses the safe-integer domain.
    const lower = BigInt(minInt)
    const count = BigInt(maxInt) - lower + (halfOpen ? BigInt("0") : BigInt("1"))
    const wide = count > BigInt("1") << BigInt("53")
    const bucketSize = (wide ? BigInt("1") << BigInt("54") : BigInt("1") << BigInt("53")) / count
    const limit = bucketSize * count
    while (true) {
      const bytes = draw()
      const value = BigInt(readUint53(bytes)) +
        (wide && (bytes[0] & 0x20) !== 0 ? BigInt("1") << BigInt("53") : BigInt("0"))
      if (value < limit) return Number(lower + value / bucketSize)
    }
  }

  return SecureRandom.of({
    [SecureRandomTypeId]: SecureRandomTypeId,
    randomBytes,
    nextDoubleUnsafe,
    nextIntUnsafe,
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
        const draw = makeDrawSource(buffer.length - 1)
        for (let i = buffer.length - 1; i >= 1; i = i - 1) {
          const index = nextIntBetweenUnsafe(0, i, false, draw)
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
      })) as SecureRandom["randomUUIDv4"],
    randomUUIDv7: ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
      Effect.clockWith((clock) =>
        tryRandom("randomUUIDv7", () => {
          const bytes = Uuid.v7Bytes(clock.currentTimeMillisUnsafe(), randomBytesUnsafe(16))
          return options?.format === "bytes" ? bytes : Uuid.stringify(bytes)
        })
      )) as SecureRandom["randomUUIDv7"],
    randomULID: Effect.clockWith((clock) =>
      tryRandom("randomULID", () =>
        Ulid.ulidString(clock.currentTimeMillisUnsafe(), randomBytesUnsafe(10)))
    )
  })
}

/**
 * Layer that provides `SecureRandom` using `globalThis.crypto.getRandomValues`.
 *
 * **Details**
 *
 * Requests larger than the 65,536-byte `getRandomValues` limit are filled in
 * chunks. `getRandomValues` is available in every supported runtime, including
 * insecure browser contexts without `crypto.subtle`.
 *
 * **Gotchas**
 *
 * The layer dies when the runtime has no global `crypto` object.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSecureRandom: Layer.Layer<SecureRandom> = Layer.effect(
  SecureRandom,
  Effect.suspend(() => {
    const crypto = globalThis.crypto
    if (!crypto) return Effect.die(new Error("Web Crypto API is not available"))
    return Effect.succeed(makeSecureRandom((size) => {
      const bytes = new Uint8Array(size)
      for (let offset = 0; offset < bytes.length; offset += 65_536) {
        crypto.getRandomValues(bytes.subarray(offset, offset + 65_536))
      }
      return bytes
    }))
  })
)

// =============================================================================
// Hashing
// =============================================================================

/**
 * SHA hash algorithms used as parameters by HMAC, key derivation, RSA, and
 * ECDSA.
 *
 * **Gotchas**
 *
 * SHA-1 is included for interoperability with existing protocols. Do not use
 * it for new security-sensitive designs.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type HashAlgorithm = "SHA-1" | Sha2Algorithm

/**
 * SHA-2 digest variants provided by the `Sha2` service.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Sha2Algorithm = "SHA-256" | "SHA-384" | "SHA-512"

/**
 * Service that computes SHA-256, SHA-384, and SHA-512 digests.
 *
 * **Example** (Hashing with SHA-256)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const sha2 = yield* Crypto.Sha2
 *   return yield* sha2.digest("SHA-256", new TextEncoder().encode("abc"))
 * })
 *
 * const digest = await Effect.runPromise(program.pipe(Effect.provide(Crypto.layerSha2)))
 * digest.length // => 32
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Sha2 extends Context.Service<Sha2, {
  /**
   * Computes a SHA-2 digest of the supplied data.
   */
  readonly digest: (algorithm: Sha2Algorithm, data: Uint8Array) => Effect.Effect<Uint8Array, CryptoError>
}>()("effect/Crypto/Sha2") {}

/**
 * Service that computes SHA-1 digests.
 *
 * **Gotchas**
 *
 * SHA-1 is not collision resistant. Use it only for interoperability with
 * existing protocols.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Sha1 extends Context.Service<Sha1, {
  /**
   * Computes a SHA-1 digest of the supplied data.
   */
  readonly digest: (data: Uint8Array) => Effect.Effect<Uint8Array, CryptoError>
}>()("effect/Crypto/Sha1") {}

/**
 * Service that computes MD5 digests.
 *
 * **Gotchas**
 *
 * MD5 is broken for security purposes. Use it only for interoperability with
 * existing protocols and checksums. Web Crypto does not provide MD5, so
 * browser platforms do not provide this service.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Md5 extends Context.Service<Md5, {
  /**
   * Computes an MD5 digest of the supplied data.
   */
  readonly digest: (data: Uint8Array) => Effect.Effect<Uint8Array, CryptoError>
}>()("effect/Crypto/Md5") {}

/**
 * Layer that provides `Sha2` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSha2: Layer.Layer<Sha2, CryptoError> = Layer.effect(
  Sha2,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    return {
      digest: (algorithm, data) =>
        attempt(algorithm, "digest", async () => new Uint8Array(await subtle.digest(algorithm, data as BufferSource)))
    }
  })
)

/**
 * Layer that provides `Sha1` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerSha1: Layer.Layer<Sha1, CryptoError> = Layer.effect(
  Sha1,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    return {
      digest: (data) =>
        attempt("SHA-1", "digest", async () => new Uint8Array(await subtle.digest("SHA-1", data as BufferSource)))
    }
  })
)

// =============================================================================
// HMAC
// =============================================================================

/**
 * Service that computes and verifies HMAC tags.
 *
 * **Details**
 *
 * Keys are `Redacted` bytes and are not bound to a hash; each operation names
 * the hash it uses. Empty keys fail with an `InvalidKey` reason.
 *
 * **Gotchas**
 *
 * Comparing a computed tag with `===` or an early-exit loop can leak timing.
 * Use `verify` to check a received tag. SHA-1 is available for legacy
 * protocols.
 *
 * **Example** (Verifying a webhook signature)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect, Redacted } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const hmac = yield* Crypto.Hmac
 *   const key = Redacted.make(new TextEncoder().encode("webhook secret"))
 *   const data = new TextEncoder().encode("{\"event\":\"paid\"}")
 *   const tag = yield* hmac.compute({ hash: "SHA-256", key, data })
 *   return yield* hmac.verify({ hash: "SHA-256", key, tag, data })
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Crypto.layerHmac))) // => true
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Hmac extends Context.Service<Hmac, {
  /**
   * Generates a random key of the hash's block size.
   */
  readonly generateKey: (options: {
    readonly hash: HashAlgorithm
  }) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError>
  /**
   * Computes the HMAC tag of the supplied data.
   */
  readonly compute: (options: {
    readonly hash: HashAlgorithm
    readonly key: Redacted.Redacted<Uint8Array>
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Checks a received tag in constant time. Returns `true` when `tag` equals
   * the HMAC of `data`; truncated tags return `false`.
   */
  readonly verify: (options: {
    readonly hash: HashAlgorithm
    readonly key: Redacted.Redacted<Uint8Array>
    readonly tag: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError>
}>()("effect/Crypto/Hmac") {}

/**
 * Reads an HMAC key from an `oct` JSON Web Key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const hmacKeyFromJwk = (jwk: JsonWebKey): Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError> =>
  secretKeyFromJwk("HMAC", "hmacKeyFromJwk", { name: "HMAC", hash: "SHA-256" }, "sign", jwk)

/**
 * Layer that provides `Hmac` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerHmac: Layer.Layer<Hmac, CryptoError> = Layer.effect(
  Hmac,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    const params = (hash: HashAlgorithm): HmacImportParams => ({ name: "HMAC", hash })
    return {
      generateKey: ({ hash }) =>
        attempt("HMAC", "generateKey", async () => {
          const handle = await subtle.generateKey(params(hash), true, ["sign"])
          return Redacted.make(new Uint8Array(await subtle.exportKey("raw", handle)))
        }),
      compute: ({ data, hash, key }) =>
        attempt("HMAC", "compute", async () => {
          const handle = await importSecretKey(subtle, key, params(hash), ["sign"])
          return new Uint8Array(await subtle.sign("HMAC", handle, data as BufferSource))
        }),
      verify: ({ data, hash, key, tag }) =>
        attempt("HMAC", "verify", async () => {
          const handle = await importSecretKey(subtle, key, params(hash), ["verify"])
          // Web Crypto compares HMAC tags in constant time and rejects other lengths.
          return await subtle.verify("HMAC", handle, tag as BufferSource, data as BufferSource)
        })
    }
  })
)

// =============================================================================
// AES
// =============================================================================

/**
 * Inputs for authenticated encryption and decryption with AES-GCM,
 * ChaCha20-Poly1305, or XChaCha20-Poly1305.
 *
 * **Details**
 *
 * `data` is plaintext for encryption and ciphertext with its appended 16-byte
 * tag for decryption. Additional data is authenticated without being
 * encrypted and defaults to empty.
 *
 * **Gotchas**
 *
 * Never reuse a nonce with the same key. Decryption must use the same nonce
 * and additional data as encryption.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface AeadOptions {
  readonly key: Redacted.Redacted<Uint8Array>
  readonly nonce: Uint8Array
  readonly data: Uint8Array
  readonly additionalData?: Uint8Array | undefined
}

/**
 * Inputs for AES-CTR encryption and decryption.
 *
 * **Details**
 *
 * `counter` is the 16-byte initial counter block. Its low `counterLength`
 * bits, between 1 and 128, increment big-endian once per 16-byte block. Each
 * call starts from the supplied counter and may span at most
 * `2^counterLength` blocks; Web Crypto rejects longer data.
 *
 * **Gotchas**
 *
 * Never reuse a counter block with the same key. Some backends, such as Deno,
 * accept only 32-, 64-, or 128-bit counter lengths.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface AesCtrOptions {
  readonly key: Redacted.Redacted<Uint8Array>
  readonly counter: Uint8Array
  readonly counterLength: number
  readonly data: Uint8Array
}

/**
 * Service for AES encryption: AES-GCM authenticated encryption and
 * unauthenticated AES-CTR.
 *
 * **Details**
 *
 * Keys are 16, 24, or 32 `Redacted` bytes; other lengths fail with an
 * `InvalidKey` reason. AES-GCM takes 12-byte nonces and appends a 16-byte tag;
 * decryption fails with an `AuthenticationFailed` reason when the tag does not
 * match. AES-CTR output has the length of its input.
 *
 * **Gotchas**
 *
 * AES-CTR output is malleable: authenticate it with `Hmac`, or prefer
 * AES-GCM. It exists for protocols such as SSH that pair it with a MAC.
 *
 * **Example** (Encrypting with AES-GCM)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const aes = yield* Crypto.Aes
 *   const key = yield* aes.generateKey()
 *   const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12))
 *   const ciphertext = yield* aes.encryptGcm({ key, nonce, data: new TextEncoder().encode("secret") })
 *   const plaintext = yield* aes.decryptGcm({ key, nonce, data: ciphertext })
 *   return [ciphertext.length, new TextDecoder().decode(plaintext)]
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Crypto.layerAes))) // => [22, "secret"]
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Aes extends Context.Service<Aes, {
  /**
   * Generates a random key.
   */
  readonly generateKey: (options?: {
    /**
     * Key length in bits.
     *
     * @default 256
     */
    readonly length?: 128 | 192 | 256 | undefined
  }) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError>
  /**
   * Encrypts with AES-GCM and appends the authentication tag.
   */
  readonly encryptGcm: (options: AeadOptions) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Authenticates and decrypts AES-GCM ciphertext.
   */
  readonly decryptGcm: (options: AeadOptions) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Encrypts with AES-CTR.
   */
  readonly encryptCtr: (options: AesCtrOptions) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Decrypts AES-CTR ciphertext.
   */
  readonly decryptCtr: (options: AesCtrOptions) => Effect.Effect<Uint8Array, CryptoError>
}>()("effect/Crypto/Aes") {}

/**
 * Reads an AES key from an `oct` JSON Web Key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const aesKeyFromJwk = (jwk: JsonWebKey): Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError> =>
  secretKeyFromJwk("AES", "aesKeyFromJwk", "AES-GCM", "encrypt", jwk)

/**
 * Layer that provides `Aes` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerAes: Layer.Layer<Aes, CryptoError> = Layer.effect(
  Aes,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    const gcm =
      (usage: "encrypt" | "decrypt", method: "encryptGcm" | "decryptGcm") =>
      ({ additionalData, data, key, nonce }: AeadOptions) => {
        const params: AesGcmParams = {
          name: "AES-GCM",
          iv: nonce as BufferSource,
          tagLength: 128,
          ...(additionalData === undefined ? {} : { additionalData: additionalData as BufferSource })
        }
        return Effect.tryPromise({
          try: async () => {
            const handle = await importSecretKey(subtle, key, "AES-GCM", [usage])
            return new Uint8Array(await subtle[usage](params, handle, data as BufferSource))
          },
          catch: (cause) =>
            usage === "decrypt" && isOperationError(cause)
              ? new CryptoError({
                algorithm: "AES-GCM",
                method,
                reason: new AuthenticationFailed({ description: "Could not authenticate or decrypt data", cause })
              })
              : webCryptoError("AES-GCM", method, cause)
        })
      }
    const ctr =
      (usage: "encrypt" | "decrypt", method: "encryptCtr" | "decryptCtr") =>
      ({ counter, counterLength, data, key }: AesCtrOptions) =>
        attempt("AES-CTR", method, async () => {
          const handle = await importSecretKey(subtle, key, "AES-CTR", [usage])
          const params: AesCtrParams = { name: "AES-CTR", counter: counter as BufferSource, length: counterLength }
          return new Uint8Array(await subtle[usage](params, handle, data as BufferSource))
        })
    return {
      generateKey: (options) =>
        attempt("AES", "generateKey", async () => {
          const handle = await subtle.generateKey({ name: "AES-GCM", length: options?.length ?? 256 }, true, [
            "encrypt"
          ])
          return Redacted.make(new Uint8Array(await subtle.exportKey("raw", handle)))
        }),
      encryptGcm: gcm("encrypt", "encryptGcm"),
      decryptGcm: gcm("decrypt", "decryptGcm"),
      encryptCtr: ctr("encrypt", "encryptCtr"),
      decryptCtr: ctr("decrypt", "decryptCtr")
    }
  })
)

// =============================================================================
// ChaCha20-Poly1305
// =============================================================================

/**
 * The operations of an authenticated cipher with 32-byte keys.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Aead {
  /**
   * Generates a random 32-byte key.
   */
  readonly generateKey: () => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError>
  /**
   * Encrypts plaintext and appends the 16-byte authentication tag.
   */
  readonly encrypt: (options: AeadOptions) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Authenticates and decrypts ciphertext.
   */
  readonly decrypt: (options: AeadOptions) => Effect.Effect<Uint8Array, CryptoError>
}

/**
 * Service for RFC 8439 ChaCha20-Poly1305 authenticated encryption.
 *
 * **Details**
 *
 * Keys are 32 `Redacted` bytes and nonces contain 12 bytes. Decryption fails
 * with an `AuthenticationFailed` reason when the tag does not match.
 *
 * **Gotchas**
 *
 * Random 12-byte nonces risk collisions after many messages under one key.
 * Use a counter nonce, or `XChaCha20Poly1305` for random nonces. Web Crypto
 * does not provide ChaCha20-Poly1305; the Node.js and Deno platform packages
 * do.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class ChaCha20Poly1305 extends Context.Service<ChaCha20Poly1305, Aead>()("effect/Crypto/ChaCha20Poly1305") {}

/**
 * Service for XChaCha20-Poly1305 authenticated encryption.
 *
 * **When to use**
 *
 * Use when nonces are generated randomly, since 24-byte nonces make
 * collisions negligible.
 *
 * **Details**
 *
 * Implements draft-irtf-cfrg-xchacha-03: HChaCha20 derives a subkey from the
 * key and the first 16 nonce bytes, and ChaCha20-Poly1305 encrypts with the
 * remaining 8. Keys are 32 `Redacted` bytes and nonces contain 24 bytes. The
 * output is compatible with libsodium's `crypto_aead_xchacha20poly1305_ietf`.
 *
 * **Gotchas**
 *
 * Web Crypto does not provide ChaCha20-Poly1305; the Node.js and Deno
 * platform packages provide this service.
 *
 * **Example** (Encrypting with a random nonce)
 *
 * ```ts
 * import { Crypto, Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const xchacha = yield* Crypto.XChaCha20Poly1305
 *   const key = yield* xchacha.generateKey()
 *   const nonce = yield* Crypto.randomBytes(24)
 *   return yield* xchacha.encrypt({ key, nonce, data: new TextEncoder().encode("secret") })
 * })
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class XChaCha20Poly1305 extends Context.Service<XChaCha20Poly1305, Aead>()("effect/Crypto/XChaCha20Poly1305") {}

// =============================================================================
// Key derivation
// =============================================================================

/**
 * Parameters for HKDF key derivation.
 *
 * **Details**
 *
 * `length` is measured in bytes and must be between 1 and 255 times the hash
 * output size. Salt and info default to empty.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface HkdfOptions {
  readonly hash: HashAlgorithm
  readonly key: Redacted.Redacted<Uint8Array>
  readonly salt?: Uint8Array | undefined
  readonly info?: Uint8Array | undefined
  readonly length: number
}

/**
 * Service for RFC 5869 HKDF key derivation.
 *
 * **Example** (Deriving a session key from a shared secret)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect, Redacted } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const hkdf = yield* Crypto.Hkdf
 *   return yield* hkdf.derive({
 *     hash: "SHA-256",
 *     key: Redacted.make(new Uint8Array(32).fill(7)),
 *     info: new TextEncoder().encode("session"),
 *     length: 32
 *   })
 * })
 *
 * const key = await Effect.runPromise(program.pipe(Effect.provide(Crypto.layerHkdf)))
 * Redacted.value(key).length // => 32
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Hkdf extends Context.Service<Hkdf, {
  /**
   * Derives secret bytes with HKDF. Lengths outside 1 to 255 times the hash
   * output size fail with a `BadArgument` reason.
   */
  readonly derive: (options: HkdfOptions) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError>
}>()("effect/Crypto/Hkdf") {}

const hashLengths: Record<HashAlgorithm, number> = { "SHA-1": 20, "SHA-256": 32, "SHA-384": 48, "SHA-512": 64 }

/**
 * Layer that provides `Hkdf` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerHkdf: Layer.Layer<Hkdf, CryptoError> = Layer.effect(
  Hkdf,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    return {
      derive: (options) => {
        // Web Crypto takes a 32-bit bit length, and some backends wrap larger
        // values instead of rejecting them.
        const maxLength = 255 * (hashLengths[options.hash] ?? 0)
        if (!Number.isSafeInteger(options.length) || options.length < 1 || options.length > maxLength) {
          return badArgument("HKDF", "derive", "length must be between 1 and 255 times the hash output size")
        }
        const params: HkdfParams = {
          name: "HKDF",
          hash: options.hash,
          salt: (options.salt ?? new Uint8Array()) as BufferSource,
          info: (options.info ?? new Uint8Array()) as BufferSource
        }
        return attempt("HKDF", "derive", async () => {
          const handle = await importSecretKey(subtle, options.key, "HKDF", ["deriveBits"])
          return Redacted.make(new Uint8Array(await subtle.deriveBits(params, handle, options.length * 8)))
        })
      }
    }
  })
)

// =============================================================================
// Password hashing
// =============================================================================

/**
 * Parameters for PBKDF2 password derivation.
 *
 * **Details**
 *
 * Iterations must be between 1 and 2^31 - 1. `length` is measured in bytes
 * and must be between 1 and 2^29 - 1.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Pbkdf2Options {
  readonly hash: HashAlgorithm
  readonly password: Uint8Array
  readonly salt: Uint8Array
  readonly iterations: number
  readonly length: number
}

/**
 * Service for PBKDF2 password hashing.
 *
 * **Gotchas**
 *
 * Interruption stops waiting for the result; native derivation may continue.
 * Prefer `Argon2id` where available, since PBKDF2 is not memory-hard.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Pbkdf2 extends Context.Service<Pbkdf2, {
  /**
   * Derives a password hash with PBKDF2. Iterations outside 1 to 2^31 - 1 and
   * lengths outside 1 to 2^29 - 1 bytes fail with a `BadArgument` reason.
   */
  readonly derive: (options: Pbkdf2Options) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Checks a password against a stored PBKDF2 hash by deriving
   * `expected.length` bytes and comparing them in constant time. A stored
   * hash whose length is not a valid output length never matches.
   */
  readonly verify: (
    options: Omit<Pbkdf2Options, "length"> & { readonly expected: Uint8Array }
  ) => Effect.Effect<boolean, CryptoError>
}>()("effect/Crypto/Pbkdf2") {}

/**
 * Parameters for Argon2id version 19 password derivation.
 *
 * **Details**
 *
 * Memory is measured in KiB and must be at least eight times parallelism.
 * The salt must contain at least eight bytes and the output at least four.
 * Secret and associated data are optional inputs to the derivation.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Argon2idOptions {
  readonly password: Uint8Array
  readonly salt: Uint8Array
  readonly memoryKiB: number
  readonly passes: number
  readonly parallelism: number
  readonly length: number
  readonly secret?: Uint8Array | undefined
  readonly associatedData?: Uint8Array | undefined
}

/**
 * Service for Argon2id password hashing.
 *
 * **Details**
 *
 * Implements RFC 9106 Argon2id, version 19. Only runtimes with native
 * Argon2id provide this service; the Node.js layer fails to build with an
 * `Unsupported` reason on versions without it.
 *
 * **Gotchas**
 *
 * Callers choose password-strength policy and must bound memory, work
 * factors, and concurrent derivations. Node's implementation waits for native
 * work to complete on interruption, so an enclosing concurrency permit remains
 * held until the native job finishes.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Argon2id extends Context.Service<Argon2id, {
  /**
   * Derives a password hash with Argon2id. Invalid memory, passes,
   * parallelism, output lengths, or salts fail with a `BadArgument` reason.
   */
  readonly derive: (options: Argon2idOptions) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Checks a password against a stored Argon2id hash by deriving
   * `expected.length` bytes and comparing them in constant time. A stored
   * hash whose length is not a valid output length never matches.
   */
  readonly verify: (
    options: Omit<Argon2idOptions, "length"> & { readonly expected: Uint8Array }
  ) => Effect.Effect<boolean, CryptoError>
}>()("effect/Crypto/Argon2id") {}

/**
 * Layer that provides `Pbkdf2` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerPbkdf2: Layer.Layer<Pbkdf2, CryptoError> = Layer.effect(
  Pbkdf2,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    // Web Crypto takes a 32-bit bit length, and some backends wrap larger
    // values instead of rejecting them. Node.js aborts the process on
    // iteration counts above 2^31 - 1.
    const validIterations = (iterations: number) =>
      Number.isSafeInteger(iterations) && iterations >= 1 && iterations <= 0x7fff_ffff
    const validLength = (length: number) => length >= 1 && length <= 0x1fff_ffff
    const derive = (method: string, options: Pbkdf2Options) => {
      const { iterations, length } = options
      if (!validIterations(iterations) || !Number.isSafeInteger(length) || !validLength(length)) {
        return badArgument(
          "PBKDF2",
          method,
          "iterations must be between 1 and 2^31 - 1 and length between 1 and 2^29 - 1"
        )
      }
      const params: Pbkdf2Params = {
        name: "PBKDF2",
        hash: options.hash,
        salt: options.salt as BufferSource,
        iterations
      }
      return attempt("PBKDF2", method, async () => {
        const handle = await subtle.importKey("raw", options.password as BufferSource, "PBKDF2", false, [
          "deriveBits"
        ])
        return new Uint8Array(await subtle.deriveBits(params, handle, length * 8))
      })
    }
    return {
      derive: (options) => derive("derive", options),
      verify: ({ expected, ...options }) => {
        if (validIterations(options.iterations) && !validLength(expected.length)) return Effect.succeed(false)
        return Effect.map(derive("verify", { ...options, length: expected.length }), (actual) => {
          // Accumulate every difference so the comparison takes constant time.
          let difference = actual.length ^ expected.length
          for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i]
          actual.fill(0)
          return difference === 0
        })
      }
    }
  })
)

// =============================================================================
// Ed25519
// =============================================================================

/**
 * An Ed25519 private key: `Redacted` PKCS8 bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Ed25519PrivateKey = Redacted.Redacted<Uint8Array<ArrayBuffer>> & Brand.Brand<"Ed25519PrivateKey">

/**
 * An Ed25519 public key: 32 raw bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Ed25519PublicKey = Uint8Array<ArrayBuffer> & Brand.Brand<"Ed25519PublicKey">

/**
 * Service for Ed25519 signatures.
 *
 * **Details**
 *
 * Signatures are deterministic 64-byte values over the unhashed message.
 * Verification returns `false` for a mismatched signature.
 *
 * **Example** (Signing and verifying)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const ed25519 = yield* Crypto.Ed25519
 *   const { privateKey, publicKey } = yield* ed25519.generateKeyPair()
 *   const data = new TextEncoder().encode("message")
 *   const signature = yield* ed25519.sign({ privateKey, data })
 *   return yield* ed25519.verify({ publicKey, signature, data })
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Crypto.layerEd25519))) // => true
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Ed25519 extends Context.Service<Ed25519, {
  /**
   * Generates a key pair.
   */
  readonly generateKeyPair: () => Effect.Effect<
    { readonly privateKey: Ed25519PrivateKey; readonly publicKey: Ed25519PublicKey },
    CryptoError
  >
  /**
   * Computes the public key of a private key.
   */
  readonly publicKey: (privateKey: Ed25519PrivateKey) => Effect.Effect<Ed25519PublicKey, CryptoError>
  /**
   * Signs data.
   */
  readonly sign: (options: {
    readonly privateKey: Ed25519PrivateKey
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Verifies a signature over data.
   */
  readonly verify: (options: {
    readonly publicKey: Ed25519PublicKey
    readonly signature: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError>
}>()("effect/Crypto/Ed25519") {}

/**
 * Creates an Ed25519 public key from its 32 raw bytes.
 *
 * **Details**
 *
 * Other lengths fail with an `InvalidKey` reason; bytes
 * that are not a curve point fail when the key is used.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ed25519PublicKey = (bytes: Uint8Array): Effect.Effect<Ed25519PublicKey, CryptoError> =>
  bytes.length === 32
    ? Effect.succeed(bytes as Ed25519PublicKey)
    : invalidKey("Ed25519", "ed25519PublicKey", "Ed25519 public keys must contain exactly 32 bytes")

// RFC 8410: the PKCS8 header of a 32-byte Ed25519 private key, which Web
// Crypto exports as the header followed by the key.
const ed25519Pkcs8Header = Uint8Array.of(48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32)

/**
 * Creates an Ed25519 private key from its 32 raw bytes, the RFC 8032 private
 * key that SSH and libsodium call the seed.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ed25519PrivateKeyFromRaw = (
  bytes: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<Ed25519PrivateKey, CryptoError> => {
  const raw = Redacted.isRedacted(bytes) ? Redacted.value(bytes) : bytes
  if (raw.length !== 32) {
    return invalidKey("Ed25519", "ed25519PrivateKeyFromRaw", "Ed25519 private keys must contain exactly 32 bytes")
  }
  const pkcs8 = new Uint8Array(ed25519Pkcs8Header.length + 32)
  pkcs8.set(ed25519Pkcs8Header)
  pkcs8.set(raw, ed25519Pkcs8Header.length)
  return Effect.succeed(Redacted.make(pkcs8) as Ed25519PrivateKey)
}

/**
 * Returns the 32 raw bytes of an Ed25519 private key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const ed25519PrivateKeyToRaw = (
  key: Ed25519PrivateKey
): Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError> => {
  const pkcs8 = Redacted.value(key)
  return pkcs8.length === ed25519Pkcs8Header.length + 32 && ed25519Pkcs8Header.every((byte, i) => pkcs8[i] === byte)
    ? Effect.succeed(Redacted.make(pkcs8.slice(ed25519Pkcs8Header.length)))
    : invalidKey("Ed25519", "ed25519PrivateKeyToRaw", "Expected Ed25519 PKCS8 in the form Web Crypto exports")
}

/**
 * Creates an Ed25519 private key from PKCS8 bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ed25519PrivateKeyFromPkcs8 = (
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<Ed25519PrivateKey, CryptoError> =>
  privateKeyFromPkcs8<Ed25519PrivateKey>("Ed25519", "ed25519PrivateKeyFromPkcs8", "Ed25519", "sign", pkcs8)

/**
 * Creates an Ed25519 private key from a private `OKP` JSON Web Key with `d`
 * and `x`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ed25519PrivateKeyFromJwk = (jwk: JsonWebKey): Effect.Effect<Ed25519PrivateKey, CryptoError> =>
  privateKeyFromJwk<Ed25519PrivateKey>("Ed25519", "ed25519PrivateKeyFromJwk", "Ed25519", "sign", jwk)

/**
 * Creates an Ed25519 public key from SPKI bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ed25519PublicKeyFromSpki = (spki: Uint8Array): Effect.Effect<Ed25519PublicKey, CryptoError> =>
  publicKeyFromSpki<Ed25519PublicKey>("Ed25519", "ed25519PublicKeyFromSpki", "Ed25519", "raw", spki)

/**
 * Creates an Ed25519 public key from an `OKP` JSON Web Key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ed25519PublicKeyFromJwk = (jwk: JsonWebKey): Effect.Effect<Ed25519PublicKey, CryptoError> =>
  publicKeyFromJwk<Ed25519PublicKey>("Ed25519", "ed25519PublicKeyFromJwk", "Ed25519", "raw", jwk)

/**
 * Encodes an Ed25519 public key as an `OKP` JSON Web Key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const ed25519PublicKeyToJwk = (key: Ed25519PublicKey): Effect.Effect<JsonWebKey, CryptoError> =>
  publicKeyToJwk("Ed25519", "ed25519PublicKeyToJwk", "Ed25519", "raw", key)

/**
 * Layer that provides `Ed25519` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerEd25519: Layer.Layer<Ed25519, CryptoError> = Layer.effect(
  Ed25519,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    return {
      generateKeyPair: () =>
        attempt("Ed25519", "generateKeyPair", async () => {
          const pair = await subtle.generateKey("Ed25519", true, ["sign", "verify"]) as CryptoKeyPair
          return {
            privateKey: Redacted.make(
              new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))
            ) as Ed25519PrivateKey,
            publicKey: new Uint8Array(await subtle.exportKey("raw", pair.publicKey)) as Ed25519PublicKey
          }
        }),
      publicKey: (privateKey) =>
        attempt(
          "Ed25519",
          "publicKey",
          async () =>
            await publicKeyOf(subtle, "Ed25519", "sign", Redacted.value(privateKey), "raw") as Ed25519PublicKey
        ),
      sign: ({ data, privateKey }) =>
        attempt("Ed25519", "sign", async () => {
          const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), "Ed25519", false, ["sign"])
          return new Uint8Array(await subtle.sign("Ed25519", handle, data as BufferSource))
        }),
      verify: ({ data, publicKey, signature }) =>
        attempt("Ed25519", "verify", async () => {
          const handle = await subtle.importKey("raw", publicKey, "Ed25519", false, ["verify"])
          return await subtle.verify("Ed25519", handle, signature as BufferSource, data as BufferSource)
        })
    }
  })
)

// =============================================================================
// ECDSA
// =============================================================================

/**
 * The NIST elliptic curves supported for ECDSA and ECDH keys.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type NamedCurve = "P-256" | "P-384" | "P-521"

// Coordinate sizes in bytes.
const curveSizes: Record<NamedCurve, number> = { "P-256": 32, "P-384": 48, "P-521": 66 }

const isPoint = (curve: NamedCurve, point: Uint8Array): boolean =>
  point.length === 1 + 2 * curveSizes[curve] && point[0] === 0x04

/**
 * An ECDSA private key: `Redacted` PKCS8 bytes.
 *
 * **Details**
 *
 * The curve is not part of the key's type. Operations name it as `curve`, and
 * keys on another curve fail with an `InvalidKey` reason.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type EcdsaPrivateKey = Redacted.Redacted<Uint8Array<ArrayBuffer>> & Brand.Brand<"EcdsaPrivateKey">

/**
 * An ECDSA public key: an uncompressed `0x04 || X || Y` point.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type EcdsaPublicKey = Uint8Array<ArrayBuffer> & Brand.Brand<"EcdsaPublicKey">

/**
 * Service for ECDSA signatures over P-256, P-384, and P-521.
 *
 * **Details**
 *
 * Each operation names the key's curve and the hash it signs with, such as
 * P-256 with SHA-256 for JOSE `ES256`. Signatures use the fixed-width IEEE
 * P1363 `r || s` encoding, not DER. Keys on another curve fail with an
 * `InvalidKey` reason.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Ecdsa extends Context.Service<Ecdsa, {
  /**
   * Generates a key pair on `curve`.
   */
  readonly generateKeyPair: (options: {
    readonly curve: NamedCurve
  }) => Effect.Effect<{ readonly privateKey: EcdsaPrivateKey; readonly publicKey: EcdsaPublicKey }, CryptoError>
  /**
   * Computes the public key of a private key on `curve`.
   */
  readonly publicKey: (curve: NamedCurve, privateKey: EcdsaPrivateKey) => Effect.Effect<EcdsaPublicKey, CryptoError>
  /**
   * Signs data.
   */
  readonly sign: (options: {
    readonly curve: NamedCurve
    readonly privateKey: EcdsaPrivateKey
    readonly hash: HashAlgorithm
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Verifies a signature over data.
   */
  readonly verify: (options: {
    readonly curve: NamedCurve
    readonly publicKey: EcdsaPublicKey
    readonly hash: HashAlgorithm
    readonly signature: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError>
}>()("effect/Crypto/Ecdsa") {}

const ecdsaParams = (namedCurve: NamedCurve): EcKeyImportParams => ({ name: "ECDSA", namedCurve })

/**
 * Creates an ECDSA public key on `curve` from an uncompressed point.
 *
 * **Details**
 *
 * Points of the wrong length or encoding fail with an
 * `InvalidKey` reason; points not on the curve fail when the key is used.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ecdsaPublicKey = (curve: NamedCurve, point: Uint8Array): Effect.Effect<EcdsaPublicKey, CryptoError> =>
  isPoint(curve, point)
    ? Effect.succeed(point as EcdsaPublicKey)
    : invalidKey("ECDSA", "ecdsaPublicKey", `Expected an uncompressed ${curve} point`)

/**
 * Creates an ECDSA private key on `curve` from PKCS8 bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ecdsaPrivateKeyFromPkcs8 = (
  curve: NamedCurve,
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<EcdsaPrivateKey, CryptoError> =>
  privateKeyFromPkcs8<EcdsaPrivateKey>("ECDSA", "ecdsaPrivateKeyFromPkcs8", ecdsaParams(curve), "sign", pkcs8)

/**
 * Creates an ECDSA private key on `curve` from a private `EC` JSON Web Key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ecdsaPrivateKeyFromJwk = (
  curve: NamedCurve,
  jwk: JsonWebKey
): Effect.Effect<EcdsaPrivateKey, CryptoError> =>
  privateKeyFromJwk<EcdsaPrivateKey>("ECDSA", "ecdsaPrivateKeyFromJwk", ecdsaParams(curve), "sign", jwk)

/**
 * Creates an ECDSA public key on `curve` from SPKI bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ecdsaPublicKeyFromSpki = (
  curve: NamedCurve,
  spki: Uint8Array
): Effect.Effect<EcdsaPublicKey, CryptoError> =>
  publicKeyFromSpki<EcdsaPublicKey>("ECDSA", "ecdsaPublicKeyFromSpki", ecdsaParams(curve), "raw", spki)

/**
 * Creates an ECDSA public key on `curve` from an `EC` JSON Web Key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ecdsaPublicKeyFromJwk = (curve: NamedCurve, jwk: JsonWebKey): Effect.Effect<EcdsaPublicKey, CryptoError> =>
  publicKeyFromJwk<EcdsaPublicKey>("ECDSA", "ecdsaPublicKeyFromJwk", ecdsaParams(curve), "raw", jwk)

/**
 * Encodes an ECDSA public key on `curve` as an `EC` JSON Web Key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const ecdsaPublicKeyToJwk = (curve: NamedCurve, key: EcdsaPublicKey): Effect.Effect<JsonWebKey, CryptoError> =>
  publicKeyToJwk("ECDSA", "ecdsaPublicKeyToJwk", ecdsaParams(curve), "raw", key)

/**
 * Layer that provides `Ecdsa` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerEcdsa: Layer.Layer<Ecdsa, CryptoError> = Layer.effect(
  Ecdsa,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    return {
      generateKeyPair: ({ curve }) =>
        attempt("ECDSA", "generateKeyPair", async () => {
          const pair = await subtle.generateKey(ecdsaParams(curve), true, ["sign", "verify"])
          return {
            privateKey: Redacted.make(
              new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))
            ) as EcdsaPrivateKey,
            publicKey: new Uint8Array(await subtle.exportKey("raw", pair.publicKey)) as EcdsaPublicKey
          }
        }),
      publicKey: (curve, privateKey) =>
        attempt(
          "ECDSA",
          "publicKey",
          async () =>
            await publicKeyOf(subtle, ecdsaParams(curve), "sign", Redacted.value(privateKey), "raw") as EcdsaPublicKey
        ),
      sign: ({ curve, data, hash, privateKey }) =>
        attempt("ECDSA", "sign", async () => {
          const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), ecdsaParams(curve), false, [
            "sign"
          ])
          return new Uint8Array(await subtle.sign({ name: "ECDSA", hash }, handle, data as BufferSource))
        }),
      verify: ({ curve, data, hash, publicKey, signature }) =>
        attempt("ECDSA", "verify", async () => {
          const handle = await subtle.importKey("raw", publicKey, ecdsaParams(curve), false, ["verify"])
          return await subtle.verify({ name: "ECDSA", hash }, handle, signature as BufferSource, data as BufferSource)
        })
    }
  })
)

// =============================================================================
// RSA
// =============================================================================

/**
 * An RSA private key: `Redacted` PKCS8 bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type RsaPrivateKey = Redacted.Redacted<Uint8Array<ArrayBuffer>> & Brand.Brand<"RsaPrivateKey">

/**
 * An RSA public key: SPKI bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type RsaPublicKey = Uint8Array<ArrayBuffer> & Brand.Brand<"RsaPublicKey">

/**
 * Options for generating RSA key pairs.
 *
 * **Details**
 *
 * The modulus defaults to 2048 bits. The public exponent is a big-endian
 * integer and defaults to 65537.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RsaKeyPairOptions {
  readonly modulusLength?: number | undefined
  readonly publicExponent?: Uint8Array | undefined
}

/**
 * Service for RSA: RSA-PSS and RSASSA-PKCS1-v1_5 signatures and RSA-OAEP
 * encryption.
 *
 * **Details**
 *
 * Each operation names its hash. RSA-PSS salt lengths are measured in bytes
 * and default to the hash output size. RSA-OAEP labels are authenticated and
 * default to empty; decryption with the wrong key, hash, or label fails with
 * an `AuthenticationFailed` reason. Verification returns `false` for a
 * mismatched signature.
 *
 * **Gotchas**
 *
 * Prefer RSA-PSS for new signatures. RSASSA-PKCS1-v1_5 is for protocols that
 * require it, such as `RS256` JWTs and SSH `rsa-sha2-*` host keys. RSA-OAEP
 * plaintext must fit in one RSA block: at most the modulus length minus twice
 * the hash length minus 2 bytes.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Rsa extends Context.Service<Rsa, {
  /**
   * Generates a key pair.
   */
  readonly generateKeyPair: (
    options?: RsaKeyPairOptions
  ) => Effect.Effect<{ readonly privateKey: RsaPrivateKey; readonly publicKey: RsaPublicKey }, CryptoError>
  /**
   * Computes the public key of a private key.
   */
  readonly publicKey: (privateKey: RsaPrivateKey) => Effect.Effect<RsaPublicKey, CryptoError>
  /**
   * Returns the modulus length of a public key in bits, for enforcing a
   * minimum key size.
   */
  readonly modulusLength: (publicKey: RsaPublicKey) => Effect.Effect<number, CryptoError>
  /**
   * Signs data with RSA-PSS.
   */
  readonly signPss: (options: {
    readonly privateKey: RsaPrivateKey
    readonly hash: HashAlgorithm
    readonly saltLength?: number | undefined
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Verifies an RSA-PSS signature over data.
   */
  readonly verifyPss: (options: {
    readonly publicKey: RsaPublicKey
    readonly hash: HashAlgorithm
    readonly saltLength?: number | undefined
    readonly signature: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError>
  /**
   * Signs data with RSASSA-PKCS1-v1_5.
   */
  readonly signPkcs1v15: (options: {
    readonly privateKey: RsaPrivateKey
    readonly hash: HashAlgorithm
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Verifies an RSASSA-PKCS1-v1_5 signature over data.
   */
  readonly verifyPkcs1v15: (options: {
    readonly publicKey: RsaPublicKey
    readonly hash: HashAlgorithm
    readonly signature: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError>
  /**
   * Encrypts plaintext with RSA-OAEP.
   */
  readonly encryptOaep: (options: {
    readonly publicKey: RsaPublicKey
    readonly hash: HashAlgorithm
    readonly data: Uint8Array
    readonly label?: Uint8Array | undefined
  }) => Effect.Effect<Uint8Array, CryptoError>
  /**
   * Decrypts RSA-OAEP ciphertext.
   */
  readonly decryptOaep: (options: {
    readonly privateKey: RsaPrivateKey
    readonly hash: HashAlgorithm
    readonly data: Uint8Array
    readonly label?: Uint8Array | undefined
  }) => Effect.Effect<Uint8Array, CryptoError>
}>()("effect/Crypto/Rsa") {}

// RSA keys are imported for one scheme at a time; exported keys are not bound
// to the scheme or hash they are imported with.
const rsaParams = (name: string, hash: HashAlgorithm = "SHA-256"): RsaHashedImportParams => ({ name, hash })

/**
 * Creates an RSA private key from PKCS8 bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const rsaPrivateKeyFromPkcs8 = (
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<RsaPrivateKey, CryptoError> =>
  privateKeyFromPkcs8<RsaPrivateKey>("RSA", "rsaPrivateKeyFromPkcs8", rsaParams("RSA-PSS"), "sign", pkcs8)

/**
 * Creates an RSA private key from a private two-prime `RSA` JSON Web Key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const rsaPrivateKeyFromJwk = (jwk: JsonWebKey): Effect.Effect<RsaPrivateKey, CryptoError> =>
  privateKeyFromJwk<RsaPrivateKey>("RSA", "rsaPrivateKeyFromJwk", rsaParams("RSA-PSS"), "sign", jwk)

/**
 * Creates an RSA public key from SPKI bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const rsaPublicKeyFromSpki = (spki: Uint8Array): Effect.Effect<RsaPublicKey, CryptoError> =>
  publicKeyFromSpki<RsaPublicKey>("RSA", "rsaPublicKeyFromSpki", rsaParams("RSA-PSS"), "spki", spki)

/**
 * Creates an RSA public key from an `RSA` JSON Web Key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const rsaPublicKeyFromJwk = (jwk: JsonWebKey): Effect.Effect<RsaPublicKey, CryptoError> =>
  publicKeyFromJwk<RsaPublicKey>("RSA", "rsaPublicKeyFromJwk", rsaParams("RSA-PSS"), "spki", jwk)

/**
 * Encodes an RSA public key as an `RSA` JSON Web Key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const rsaPublicKeyToJwk = (key: RsaPublicKey): Effect.Effect<JsonWebKey, CryptoError> =>
  publicKeyToJwk("RSA", "rsaPublicKeyToJwk", rsaParams("RSA-PSS"), "spki", key)

/**
 * Layer that provides `Rsa` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerRsa: Layer.Layer<Rsa, CryptoError> = Layer.effect(
  Rsa,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    // The salt length defaults to the hash output size.
    const pss = (hash: HashAlgorithm, saltLength: number | undefined): RsaPssParams => ({
      name: "RSA-PSS",
      saltLength: saltLength ?? hashLengths[hash]
    })
    const oaep = (label: Uint8Array | undefined): RsaOaepParams =>
      label === undefined ? { name: "RSA-OAEP" } : { name: "RSA-OAEP", label: label as BufferSource }
    const sign = (algorithm: string, method: string, params: AlgorithmIdentifier | RsaPssParams) =>
    (
      { data, hash, privateKey }: {
        readonly privateKey: RsaPrivateKey
        readonly hash: HashAlgorithm
        readonly data: Uint8Array
      }
    ) =>
      attempt(algorithm, method, async () => {
        const handle = await subtle.importKey(
          "pkcs8",
          Redacted.value(privateKey),
          rsaParams(algorithm, hash),
          false,
          [
            "sign"
          ]
        )
        return new Uint8Array(await subtle.sign(params, handle, data as BufferSource))
      })
    const verify =
      (algorithm: string, method: string, params: AlgorithmIdentifier | RsaPssParams) =>
      ({ data, hash, publicKey, signature }: {
        readonly publicKey: RsaPublicKey
        readonly hash: HashAlgorithm
        readonly signature: Uint8Array
        readonly data: Uint8Array
      }) =>
        attempt(algorithm, method, async () => {
          const handle = await subtle.importKey("spki", publicKey, rsaParams(algorithm, hash), false, ["verify"])
          return await subtle.verify(params, handle, signature as BufferSource, data as BufferSource)
        })
    return {
      generateKeyPair: (options) => {
        const params: RsaHashedKeyGenParams = {
          ...rsaParams("RSA-PSS"),
          modulusLength: options?.modulusLength ?? 2048,
          publicExponent: (options?.publicExponent ?? Uint8Array.of(1, 0, 1)) as Uint8Array<ArrayBuffer>
        }
        return attempt("RSA", "generateKeyPair", async () => {
          const pair = await subtle.generateKey(params, true, ["sign", "verify"])
          return {
            privateKey: Redacted.make(
              new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))
            ) as RsaPrivateKey,
            publicKey: new Uint8Array(await subtle.exportKey("spki", pair.publicKey)) as RsaPublicKey
          }
        })
      },
      publicKey: (privateKey) =>
        attempt(
          "RSA",
          "publicKey",
          async () =>
            await publicKeyOf(subtle, rsaParams("RSA-PSS"), "sign", Redacted.value(privateKey), "spki") as RsaPublicKey
        ),
      modulusLength: (publicKey) =>
        attempt("RSA", "modulusLength", async () => {
          const handle = await subtle.importKey("spki", publicKey, rsaParams("RSA-PSS"), false, ["verify"])
          return (handle.algorithm as RsaHashedKeyAlgorithm).modulusLength
        }),
      signPss: (options) => sign("RSA-PSS", "signPss", pss(options.hash, options.saltLength))(options),
      verifyPss: (options) => verify("RSA-PSS", "verifyPss", pss(options.hash, options.saltLength))(options),
      signPkcs1v15: sign("RSASSA-PKCS1-v1_5", "signPkcs1v15", "RSASSA-PKCS1-v1_5"),
      verifyPkcs1v15: verify("RSASSA-PKCS1-v1_5", "verifyPkcs1v15", "RSASSA-PKCS1-v1_5"),
      encryptOaep: ({ data, hash, label, publicKey }) => {
        const params = oaep(label)
        return attempt("RSA-OAEP", "encryptOaep", async () => {
          const handle = await subtle.importKey("spki", publicKey, rsaParams("RSA-OAEP", hash), false, ["encrypt"])
          return new Uint8Array(await subtle.encrypt(params, handle, data as BufferSource))
        })
      },
      decryptOaep: ({ data, hash, label, privateKey }) => {
        const params = oaep(label)
        return Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey(
              "pkcs8",
              Redacted.value(privateKey),
              rsaParams("RSA-OAEP", hash),
              false,
              ["decrypt"]
            )
            return new Uint8Array(await subtle.decrypt(params, handle, data as BufferSource))
          },
          catch: (cause) =>
            isOperationError(cause)
              ? new CryptoError({
                algorithm: "RSA-OAEP",
                method: "decryptOaep",
                reason: new AuthenticationFailed({ description: "Could not authenticate or decrypt data", cause })
              })
              : webCryptoError("RSA-OAEP", "decryptOaep", cause)
        })
      }
    }
  })
)

// =============================================================================
// ECDH
// =============================================================================

/**
 * The curves supported for ECDH key agreement: X25519 (RFC 7748) and the NIST
 * curves.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type EcdhCurve = "X25519" | NamedCurve

/**
 * An ECDH private key: `Redacted` PKCS8 bytes.
 *
 * **Details**
 *
 * The curve is not part of the key's type. Operations name it as `curve`, and
 * keys on another curve fail with an `InvalidKey` reason.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type EcdhPrivateKey = Redacted.Redacted<Uint8Array<ArrayBuffer>> & Brand.Brand<"EcdhPrivateKey">

/**
 * An ECDH public key: 32 raw bytes for X25519, or an uncompressed
 * `0x04 || X || Y` point on a NIST curve.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type EcdhPublicKey = Uint8Array<ArrayBuffer> & Brand.Brand<"EcdhPublicKey">

/**
 * Service for ECDH key agreement over X25519, P-256, P-384, and P-521.
 *
 * **Details**
 *
 * Each operation names the curve of both keys. Public keys are the raw bytes
 * protocols such as TLS and SSH exchange. Shared secrets are `Redacted` raw
 * key-agreement output with the curve's length: 32 bytes for X25519 and P-256,
 * 48 for P-384, and 66 for P-521. Derive keys from them with `Hkdf`.
 *
 * **Gotchas**
 *
 * An X25519 peer key of small order produces an all-zero secret, which fails
 * with an `InvalidKey` reason as RFC 7748 requires.
 *
 * **Example** (Agreeing on a shared secret)
 *
 * ```ts import.meta.vitest
 * import { Crypto, Effect, Redacted } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const ecdh = yield* Crypto.Ecdh
 *   const alice = yield* ecdh.generateKeyPair({ curve: "X25519" })
 *   const bob = yield* ecdh.generateKeyPair({ curve: "X25519" })
 *   const secret = yield* ecdh.deriveSharedSecret({
 *     curve: "X25519",
 *     privateKey: alice.privateKey,
 *     publicKey: bob.publicKey
 *   })
 *   return Redacted.value(secret).length
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Crypto.layerEcdh))) // => 32
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Ecdh extends Context.Service<Ecdh, {
  /**
   * Generates a key pair on `curve`.
   */
  readonly generateKeyPair: (options: {
    readonly curve: EcdhCurve
  }) => Effect.Effect<{ readonly privateKey: EcdhPrivateKey; readonly publicKey: EcdhPublicKey }, CryptoError>
  /**
   * Computes the public key of a private key on `curve`.
   */
  readonly publicKey: (curve: EcdhCurve, privateKey: EcdhPrivateKey) => Effect.Effect<EcdhPublicKey, CryptoError>
  /**
   * Computes the shared secret of a private key and a peer's public key.
   */
  readonly deriveSharedSecret: (options: {
    readonly curve: EcdhCurve
    readonly privateKey: EcdhPrivateKey
    readonly publicKey: EcdhPublicKey
  }) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError>
}>()("effect/Crypto/Ecdh") {}

const ecdhParams = (curve: EcdhCurve): AlgorithmIdentifier | EcKeyImportParams =>
  curve === "X25519" ? "X25519" : { name: "ECDH", namedCurve: curve }

const sharedSecretBits: Record<EcdhCurve, number> = { "X25519": 256, "P-256": 256, "P-384": 384, "P-521": 528 }

/**
 * Creates an ECDH public key on `curve` from its raw bytes: 32 bytes for
 * X25519, or an uncompressed point on a NIST curve.
 *
 * **Details**
 *
 * Keys of the wrong length or encoding fail with an
 * `InvalidKey` reason; points not on the curve fail when the key is used.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ecdhPublicKey = (curve: EcdhCurve, bytes: Uint8Array): Effect.Effect<EcdhPublicKey, CryptoError> =>
  (curve === "X25519" ? bytes.length === 32 : isPoint(curve, bytes))
    ? Effect.succeed(bytes as EcdhPublicKey)
    : invalidKey("ECDH", "ecdhPublicKey", `Expected a raw ${curve} public key`)

/**
 * Creates an ECDH private key on `curve` from PKCS8 bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ecdhPrivateKeyFromPkcs8 = (
  curve: EcdhCurve,
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<EcdhPrivateKey, CryptoError> =>
  privateKeyFromPkcs8<EcdhPrivateKey>("ECDH", "ecdhPrivateKeyFromPkcs8", ecdhParams(curve), "deriveBits", pkcs8)

/**
 * Creates an ECDH public key on `curve` from an `OKP` or `EC` JSON Web Key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const ecdhPublicKeyFromJwk = (curve: EcdhCurve, jwk: JsonWebKey): Effect.Effect<EcdhPublicKey, CryptoError> =>
  publicKeyFromJwk<EcdhPublicKey>("ECDH", "ecdhPublicKeyFromJwk", ecdhParams(curve), "raw", jwk)

/**
 * Encodes an ECDH public key on `curve` as an `OKP` or `EC` JSON Web Key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const ecdhPublicKeyToJwk = (curve: EcdhCurve, key: EcdhPublicKey): Effect.Effect<JsonWebKey, CryptoError> =>
  publicKeyToJwk("ECDH", "ecdhPublicKeyToJwk", ecdhParams(curve), "raw", key)

/**
 * Layer that provides `Ecdh` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerEcdh: Layer.Layer<Ecdh, CryptoError> = Layer.effect(
  Ecdh,
  Effect.gen(function*() {
    const subtle = yield* subtleCrypto
    return {
      generateKeyPair: ({ curve }) =>
        attempt("ECDH", "generateKeyPair", async () => {
          const pair = await subtle.generateKey(ecdhParams(curve), true, ["deriveBits"]) as CryptoKeyPair
          return {
            privateKey: Redacted.make(
              new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))
            ) as EcdhPrivateKey,
            publicKey: new Uint8Array(await subtle.exportKey("raw", pair.publicKey)) as EcdhPublicKey
          }
        }),
      publicKey: (curve, privateKey) =>
        attempt("ECDH", "publicKey", async () =>
          await publicKeyOf(
            subtle,
            ecdhParams(curve),
            "deriveBits",
            Redacted.value(privateKey),
            "raw"
          ) as EcdhPublicKey),
      deriveSharedSecret: ({ curve, privateKey, publicKey }) =>
        Effect.tryPromise({
          try: async () => {
            const params = ecdhParams(curve)
            const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), params, false, ["deriveBits"])
            const peer = await subtle.importKey("raw", publicKey, params, true, [])
            const name = curve === "X25519" ? "X25519" : "ECDH"
            return new Uint8Array(await subtle.deriveBits({ name, public: peer }, handle, sharedSecretBits[curve]))
          },
          // A peer key that is invalid or of small order fails with an `OperationError`.
          catch: (cause) =>
            isOperationError(cause)
              ? new CryptoError({
                algorithm: "ECDH",
                method: "deriveSharedSecret",
                reason: new InvalidKey({ description: "Invalid peer public key", cause })
              })
              : webCryptoError("ECDH", "deriveSharedSecret", cause)
        }).pipe(
          Effect.flatMap((secret) =>
            // RFC 7748 section 6.1: an all-zero X25519 output means the peer sent
            // a small-order point, and protocols such as SSH must abort.
            curve === "X25519" && secret.every((byte) => byte === 0)
              ? invalidKey("ECDH", "deriveSharedSecret", "X25519 shared secret must not be all zeros")
              : Effect.succeed(Redacted.make(secret))
          )
        )
    }
  })
)
