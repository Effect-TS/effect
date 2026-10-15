/**
 * ECDSA signatures on the NIST curves P-256, P-384, and P-521, and ECDSA keys
 * and their encodings.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Brand from "../Brand.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Predicate from "../Predicate.ts"
import * as Redacted from "../Redacted.ts"
import * as CryptoError from "./CryptoError.ts"
import * as WebCrypto from "./internal/webCrypto.ts"

/**
 * SHA hash algorithms accepted by this module.
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
export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"

/**
 * The NIST elliptic curves supported for ECDSA and ECDH keys.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Curve = "P-256" | "P-384" | "P-521"

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
export type PrivateKey = Redacted.Redacted<Uint8Array<ArrayBuffer>> & Brand.Brand<"EcdsaPrivateKey">

/**
 * An ECDSA public key: an uncompressed `0x04 || X || Y` point.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type PublicKey = Uint8Array<ArrayBuffer> & Brand.Brand<"EcdsaPublicKey">

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
    readonly curve: Curve
  }) => Effect.Effect<{ readonly privateKey: PrivateKey; readonly publicKey: PublicKey }, CryptoError.CryptoError>
  /**
   * Signs data.
   */
  readonly sign: (options: {
    readonly curve: Curve
    readonly privateKey: PrivateKey
    readonly hash: HashAlgorithm
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Verifies a signature over data.
   */
  readonly verify: (options: {
    readonly curve: Curve
    readonly publicKey: PublicKey
    readonly hash: HashAlgorithm
    readonly signature: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError.CryptoError>
}>()("effect/crypto/Ecdsa") {}

const ecdsaParams = (namedCurve: Curve): EcKeyImportParams => ({ name: "ECDSA", namedCurve })

// Coordinate sizes in bytes.
const coordinateSizes = { "P-256": 32, "P-384": 48, "P-521": 66 } as const

// Checks the uncompressed encoding of a point: 0x04 followed by both coordinates.
const isPoint = (curve: keyof typeof coordinateSizes, point: Uint8Array): boolean =>
  point.length === 1 + 2 * coordinateSizes[curve] && point[0] === 0x04

// Deno imports raw points that are not on the curve, then rejects them with a
// `TypeError` when the key is used. Only the key can cause it, so it is a key
// error rather than a bad argument.
const publicKeyError = (method: string, cause: unknown): CryptoError.CryptoError =>
  Predicate.hasProperty(cause, "name") && cause.name === "TypeError"
    ? new CryptoError.CryptoError({
      module: "ECDSA",
      method,
      reason: new CryptoError.InvalidKey({ description: "Invalid public key", cause })
    })
    : WebCrypto.webCryptoError("ECDSA", method, cause)

/**
 * Creates an ECDSA public key on `curve` from an uncompressed point.
 *
 * **Details**
 *
 * The key is a copy of `point`. Points of the wrong length or encoding fail
 * with an `InvalidKey` reason; points not on the curve fail with an
 * `InvalidKey` reason when the key is used.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromRaw = (curve: Curve, point: Uint8Array): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  isPoint(curve, point)
    ? Effect.succeed(new Uint8Array(point) as PublicKey)
    : Effect.fail(
      new CryptoError.CryptoError({
        module: "ECDSA",
        method: "publicKeyFromRaw",
        reason: new CryptoError.InvalidKey({ description: `Expected an uncompressed ${curve} point` })
      })
    )

/**
 * Creates an ECDSA private key on `curve` from PKCS8 bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const privateKeyFromPkcs8 = (
  curve: Curve,
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<PrivateKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const bytes = Redacted.isRedacted(pkcs8) ? Redacted.value(pkcs8) : pkcs8
        const handle = await subtle.importKey("pkcs8", bytes as BufferSource, ecdsaParams(curve), true, ["sign"])
        return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as PrivateKey
      },
      catch: (cause) => WebCrypto.webCryptoError("ECDSA", "privateKeyFromPkcs8", cause)
    }))

/**
 * Creates an ECDSA private key on `curve` from a private `EC` JSON Web Key.
 *
 * **Details**
 *
 * A public JWK, without `d`, fails with an `InvalidKey` reason. `alg`, `use`,
 * and `key_ops` are not checked.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const privateKeyFromJwk = (
  curve: Curve,
  jwk: JsonWebKey
): Effect.Effect<PrivateKey, CryptoError.CryptoError> =>
  // Web Crypto rejects a public JWK as a usage error, not a key error.
  jwk.d === undefined
    ? Effect.fail(
      new CryptoError.CryptoError({
        module: "ECDSA",
        method: "privateKeyFromJwk",
        reason: new CryptoError.InvalidKey({ description: "Expected a private JWK with d" })
      })
    )
    : Effect.flatMap(WebCrypto.subtle, (subtle) =>
      Effect.tryPromise({
        try: async () => {
          // Web Crypto would check these JOSE members against the import parameters.
          const { alg, use, key_ops, ext, ...material } = jwk
          const handle = await subtle.importKey("jwk", material, ecdsaParams(curve), true, ["sign"])
          return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as PrivateKey
        },
        catch: (cause) => WebCrypto.webCryptoError("ECDSA", "privateKeyFromJwk", cause)
      }))

/**
 * Creates an ECDSA public key on `curve` from SPKI bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromSpki = (
  curve: Curve,
  spki: Uint8Array
): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("spki", spki as BufferSource, ecdsaParams(curve), true, [])
        return new Uint8Array(await subtle.exportKey("raw", handle)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("ECDSA", "publicKeyFromSpki", cause)
    }))

/**
 * Creates an ECDSA public key on `curve` from an `EC` JSON Web Key.
 *
 * **Details**
 *
 * The public key of a private JWK is read without its `d`. `alg`, `use`, and
 * `key_ops` are not checked.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromJwk = (curve: Curve, jwk: JsonWebKey): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        // Web Crypto would check these JOSE members against the import parameters.
        const { alg, use, key_ops, ext, d, ...material } = jwk
        const handle = await subtle.importKey("jwk", material, ecdsaParams(curve), true, [])
        return new Uint8Array(await subtle.exportKey("raw", handle)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("ECDSA", "publicKeyFromJwk", cause)
    }))

/**
 * Computes the public key of an ECDSA private key on `curve`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromPrivateKey = (
  curve: Curve,
  privateKey: PrivateKey
): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        // Web Crypto cannot export the public key of a private key, so the
        // public members of its JWK export are imported as a public key.
        const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), ecdsaParams(curve), true, ["sign"])
        const { d, ...publicJwk } = await subtle.exportKey("jwk", handle)
        const publicKey = await subtle.importKey("jwk", publicJwk, ecdsaParams(curve), true, [])
        return new Uint8Array(await subtle.exportKey("raw", publicKey)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("ECDSA", "publicKeyFromPrivateKey", cause)
    }))

/**
 * Encodes an ECDSA public key on `curve` as SPKI bytes.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const publicKeyToSpki = (curve: Curve, key: PublicKey): Effect.Effect<Uint8Array, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("raw", key, ecdsaParams(curve), true, [])
        return new Uint8Array(await subtle.exportKey("spki", handle))
      },
      catch: (cause) => publicKeyError("publicKeyToSpki", cause)
    }))

/**
 * Encodes an ECDSA public key on `curve` as an `EC` JSON Web Key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const publicKeyToJwk = (curve: Curve, key: PublicKey): Effect.Effect<JsonWebKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("raw", key, ecdsaParams(curve), true, [])
        const { alg, key_ops, ext, ...jwk } = await subtle.exportKey("jwk", handle)
        return jwk
      },
      catch: (cause) => publicKeyError("publicKeyToJwk", cause)
    }))

/**
 * Layer that provides `Ecdsa` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Ecdsa, CryptoError.CryptoError> = Layer.effect(
  Ecdsa,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtle
    return {
      generateKeyPair: ({ curve }) =>
        Effect.tryPromise({
          try: async () => {
            const pair = await subtle.generateKey(ecdsaParams(curve), true, ["sign", "verify"])
            return {
              privateKey: Redacted.make(
                new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))
              ) as PrivateKey,
              publicKey: new Uint8Array(await subtle.exportKey("raw", pair.publicKey)) as PublicKey
            }
          },
          catch: (cause) => WebCrypto.webCryptoError("ECDSA", "generateKeyPair", cause)
        }),
      sign: ({ curve, data, hash, privateKey }) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), ecdsaParams(curve), false, [
              "sign"
            ])
            return new Uint8Array(await subtle.sign({ name: "ECDSA", hash }, handle, data as BufferSource))
          },
          catch: (cause) => WebCrypto.webCryptoError("ECDSA", "sign", cause)
        }),
      verify: ({ curve, data, hash, publicKey, signature }) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey("raw", publicKey, ecdsaParams(curve), false, ["verify"])
            return await subtle.verify({ name: "ECDSA", hash }, handle, signature as BufferSource, data as BufferSource)
          },
          catch: (cause) => publicKeyError("verify", cause)
        })
    }
  })
)
