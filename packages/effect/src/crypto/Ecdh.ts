/**
 * Elliptic-curve Diffie-Hellman key agreement on X25519, P-256, P-384, and
 * P-521, and ECDH keys and their encodings.
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
import type * as Ecdsa from "./Ecdsa.ts"
import * as WebCrypto from "./WebCrypto.ts"

/**
 * The curves supported for ECDH key agreement: X25519 (RFC 7748) and the NIST
 * curves.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Curve = "X25519" | Ecdsa.Curve

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
export type PrivateKey = Redacted.Redacted<Uint8Array<ArrayBuffer>> & Brand.Brand<"EcdhPrivateKey">

/**
 * An ECDH public key: 32 raw bytes for X25519, or an uncompressed
 * `0x04 || X || Y` point on a NIST curve.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type PublicKey = Uint8Array<ArrayBuffer> & Brand.Brand<"EcdhPublicKey">

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
 * import { Effect, Redacted } from "effect"
 * import { Ecdh } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const ecdh = yield* Ecdh.Ecdh
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
 * await Effect.runPromise(program.pipe(Effect.provide(Ecdh.layer))) // => 32
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
    readonly curve: Curve
  }) => Effect.Effect<{ readonly privateKey: PrivateKey; readonly publicKey: PublicKey }, CryptoError.CryptoError>
  /**
   * Computes the shared secret of a private key and a peer's public key.
   */
  readonly deriveSharedSecret: (options: {
    readonly curve: Curve
    readonly privateKey: PrivateKey
    readonly publicKey: PublicKey
  }) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError>
}>()("effect/crypto/Ecdh") {}

const ecdhParams = (curve: Curve): AlgorithmIdentifier | EcKeyImportParams =>
  curve === "X25519" ? "X25519" : { name: "ECDH", namedCurve: curve }

const sharedSecretBits: Record<Curve, number> = { "X25519": 256, "P-256": 256, "P-384": 384, "P-521": 528 }

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
      algorithm: "ECDH",
      method,
      reason: new CryptoError.InvalidKey({ description: "Invalid public key", cause })
    })
    : WebCrypto.webCryptoError("ECDH", method, cause)

/**
 * Creates an ECDH public key on `curve` from its raw bytes: 32 bytes for
 * X25519, or an uncompressed point on a NIST curve.
 *
 * **Details**
 *
 * The key is a copy of `bytes`. Keys of the wrong length or encoding fail
 * with an `InvalidKey` reason; points not on the curve fail with an
 * `InvalidKey` reason when the key is used.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromRaw = (curve: Curve, bytes: Uint8Array): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  (curve === "X25519" ? bytes.length === 32 : isPoint(curve, bytes))
    ? Effect.succeed(new Uint8Array(bytes) as PublicKey)
    : Effect.fail(
      new CryptoError.CryptoError({
        algorithm: "ECDH",
        method: "publicKeyFromRaw",
        reason: new CryptoError.InvalidKey({ description: `Expected a raw ${curve} public key` })
      })
    )

// RFC 8410: the PKCS8 header of a 32-byte X25519 private key, which Web
// Crypto exports as the header followed by the key.
const x25519Pkcs8Header = Uint8Array.of(48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 110, 4, 34, 4, 32)

/**
 * Creates an X25519 private key from its 32 raw bytes, the RFC 7748 scalar
 * that WireGuard, age, and HPKE exchange.
 *
 * **Details**
 *
 * Other lengths fail with an `InvalidKey` reason. NIST curve private keys have
 * no raw form that Web Crypto imports; use {@link privateKeyFromPkcs8} or
 * {@link privateKeyFromJwk}.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const privateKeyFromRaw = (
  curve: "X25519",
  bytes: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<PrivateKey, CryptoError.CryptoError> => {
  const raw = Redacted.isRedacted(bytes) ? Redacted.value(bytes) : bytes
  if (raw.length !== 32) {
    return Effect.fail(
      new CryptoError.CryptoError({
        algorithm: "ECDH",
        method: "privateKeyFromRaw",
        reason: new CryptoError.InvalidKey({ description: `${curve} private keys must contain exactly 32 bytes` })
      })
    )
  }
  const pkcs8 = new Uint8Array(x25519Pkcs8Header.length + 32)
  pkcs8.set(x25519Pkcs8Header)
  pkcs8.set(raw, x25519Pkcs8Header.length)
  return Effect.succeed(Redacted.make(pkcs8) as PrivateKey)
}

/**
 * Returns the 32 raw bytes of an X25519 private key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const privateKeyToRaw = (
  curve: "X25519",
  key: PrivateKey
): Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError> => {
  const pkcs8 = Redacted.value(key)
  return pkcs8.length === x25519Pkcs8Header.length + 32 && x25519Pkcs8Header.every((byte, i) => pkcs8[i] === byte)
    ? Effect.succeed(Redacted.make(pkcs8.slice(x25519Pkcs8Header.length)))
    : Effect.fail(
      new CryptoError.CryptoError({
        algorithm: "ECDH",
        method: "privateKeyToRaw",
        reason: new CryptoError.InvalidKey({ description: `Expected ${curve} PKCS8 in the form Web Crypto exports` })
      })
    )
}

/**
 * Creates an ECDH private key on `curve` from PKCS8 bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const privateKeyFromPkcs8 = (
  curve: Curve,
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<PrivateKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtleCrypto, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const bytes = Redacted.isRedacted(pkcs8) ? Redacted.value(pkcs8) : pkcs8
        const handle = await subtle.importKey("pkcs8", bytes as BufferSource, ecdhParams(curve), true, ["deriveBits"])
        return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as PrivateKey
      },
      catch: (cause) => WebCrypto.webCryptoError("ECDH", "privateKeyFromPkcs8", cause)
    }))

/**
 * Creates an ECDH private key on `curve` from a private `OKP` or `EC` JSON Web
 * Key with `d`.
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
export const privateKeyFromJwk = (curve: Curve, jwk: JsonWebKey): Effect.Effect<PrivateKey, CryptoError.CryptoError> =>
  // Web Crypto rejects a public JWK as a usage error, not a key error.
  jwk.d === undefined
    ? Effect.fail(
      new CryptoError.CryptoError({
        algorithm: "ECDH",
        method: "privateKeyFromJwk",
        reason: new CryptoError.InvalidKey({ description: "Expected a private JWK with d" })
      })
    )
    : Effect.flatMap(WebCrypto.subtleCrypto, (subtle) =>
      Effect.tryPromise({
        try: async () => {
          // Web Crypto would check these JOSE members against the import parameters.
          const { alg, use, key_ops, ext, ...material } = jwk
          const handle = await subtle.importKey("jwk", material, ecdhParams(curve), true, ["deriveBits"])
          return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as PrivateKey
        },
        catch: (cause) => WebCrypto.webCryptoError("ECDH", "privateKeyFromJwk", cause)
      }))

/**
 * Computes the public key of an ECDH private key on `curve`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromPrivateKey = (
  curve: Curve,
  privateKey: PrivateKey
): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtleCrypto, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        // Web Crypto cannot export the public key of a private key, so the
        // public members of its JWK export are imported as a public key.
        const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), ecdhParams(curve), true, [
          "deriveBits"
        ])
        const { d, ...publicJwk } = await subtle.exportKey("jwk", handle)
        const publicKey = await subtle.importKey("jwk", publicJwk, ecdhParams(curve), true, [])
        return new Uint8Array(await subtle.exportKey("raw", publicKey)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("ECDH", "publicKeyFromPrivateKey", cause)
    }))

/**
 * Creates an ECDH public key on `curve` from SPKI bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromSpki = (curve: Curve, spki: Uint8Array): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtleCrypto, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("spki", spki as BufferSource, ecdhParams(curve), true, [])
        return new Uint8Array(await subtle.exportKey("raw", handle)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("ECDH", "publicKeyFromSpki", cause)
    }))

/**
 * Encodes an ECDH public key on `curve` as SPKI bytes.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const publicKeyToSpki = (curve: Curve, key: PublicKey): Effect.Effect<Uint8Array, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtleCrypto, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("raw", key, ecdhParams(curve), true, [])
        return new Uint8Array(await subtle.exportKey("spki", handle))
      },
      catch: (cause) => publicKeyError("publicKeyToSpki", cause)
    }))

/**
 * Creates an ECDH public key on `curve` from an `OKP` or `EC` JSON Web Key.
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
  Effect.flatMap(WebCrypto.subtleCrypto, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        // Web Crypto would check these JOSE members against the import parameters.
        const { alg, use, key_ops, ext, d, ...material } = jwk
        const handle = await subtle.importKey("jwk", material, ecdhParams(curve), true, [])
        return new Uint8Array(await subtle.exportKey("raw", handle)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("ECDH", "publicKeyFromJwk", cause)
    }))

/**
 * Encodes an ECDH public key on `curve` as an `OKP` or `EC` JSON Web Key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const publicKeyToJwk = (curve: Curve, key: PublicKey): Effect.Effect<JsonWebKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtleCrypto, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("raw", key, ecdhParams(curve), true, [])
        const { alg, key_ops, ext, ...jwk } = await subtle.exportKey("jwk", handle)
        return jwk
      },
      catch: (cause) => publicKeyError("publicKeyToJwk", cause)
    }))

/**
 * Layer that provides `Ecdh` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Ecdh, CryptoError.CryptoError> = Layer.effect(
  Ecdh,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtleCrypto
    return {
      generateKeyPair: ({ curve }) =>
        Effect.tryPromise({
          try: async () => {
            const pair = await subtle.generateKey(ecdhParams(curve), true, ["deriveBits"]) as CryptoKeyPair
            return {
              privateKey: Redacted.make(
                new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))
              ) as PrivateKey,
              publicKey: new Uint8Array(await subtle.exportKey("raw", pair.publicKey)) as PublicKey
            }
          },
          catch: (cause) => WebCrypto.webCryptoError("ECDH", "generateKeyPair", cause)
        }),
      deriveSharedSecret: ({ curve, privateKey, publicKey }) =>
        // The keys are imported separately, so an `OperationError` from an
        // import is not attributed to the peer key.
        Effect.tryPromise({
          try: async () => {
            const params = ecdhParams(curve)
            return {
              handle: await subtle.importKey("pkcs8", Redacted.value(privateKey), params, false, ["deriveBits"]),
              peer: await subtle.importKey("raw", publicKey, params, true, [])
            }
          },
          catch: (cause) => WebCrypto.webCryptoError("ECDH", "deriveSharedSecret", cause)
        }).pipe(
          Effect.flatMap(({ handle, peer }) =>
            Effect.tryPromise({
              try: async () => {
                const name = curve === "X25519" ? "X25519" : "ECDH"
                return new Uint8Array(await subtle.deriveBits({ name, public: peer }, handle, sharedSecretBits[curve]))
              },
              // A peer key that is invalid or of small order fails with an
              // `OperationError`, or with a `TypeError` on Deno.
              catch: (cause) =>
                WebCrypto.isOperationError(cause)
                  ? new CryptoError.CryptoError({
                    algorithm: "ECDH",
                    method: "deriveSharedSecret",
                    reason: new CryptoError.InvalidKey({ description: "Invalid peer public key", cause })
                  })
                  : publicKeyError("deriveSharedSecret", cause)
            })
          ),
          Effect.flatMap((secret) =>
            // RFC 7748 section 6.1: an all-zero X25519 output means the peer sent
            // a small-order point, and protocols such as SSH must abort.
            curve === "X25519" && secret.every((byte) => byte === 0)
              ? Effect.fail(
                new CryptoError.CryptoError({
                  algorithm: "ECDH",
                  method: "deriveSharedSecret",
                  reason: new CryptoError.InvalidKey({ description: "X25519 shared secret must not be all zeros" })
                })
              )
              : Effect.succeed(Redacted.make(secret))
          )
        )
    }
  })
)
