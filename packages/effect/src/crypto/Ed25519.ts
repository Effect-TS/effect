/**
 * Ed25519 signatures, and Ed25519 keys and their encodings.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Brand from "../Brand.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Redacted from "../Redacted.ts"
import * as CryptoError from "./CryptoError.ts"
import * as WebCrypto from "./internal/webCrypto.ts"

/**
 * An Ed25519 private key: `Redacted` PKCS8 bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type PrivateKey = Redacted.Redacted<Uint8Array<ArrayBuffer>> & Brand.Brand<"Ed25519PrivateKey">

/**
 * An Ed25519 public key: 32 raw bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type PublicKey = Uint8Array<ArrayBuffer> & Brand.Brand<"Ed25519PublicKey">

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
 * import { Effect } from "effect"
 * import { Ed25519 } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const ed25519 = yield* Ed25519.Ed25519
 *   const { privateKey, publicKey } = yield* ed25519.generateKeyPair()
 *   const data = new TextEncoder().encode("message")
 *   const signature = yield* ed25519.sign({ privateKey, data })
 *   return yield* ed25519.verify({ publicKey, signature, data })
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Ed25519.layer))) // => true
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
    { readonly privateKey: PrivateKey; readonly publicKey: PublicKey },
    CryptoError.CryptoError
  >
  /**
   * Signs data.
   */
  readonly sign: (options: {
    readonly privateKey: PrivateKey
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Verifies a signature over data.
   */
  readonly verify: (options: {
    readonly publicKey: PublicKey
    readonly signature: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError.CryptoError>
}>()("effect/crypto/Ed25519") {}

/**
 * Creates an Ed25519 public key from its 32 raw bytes.
 *
 * **Details**
 *
 * The key is a copy of `bytes`. Other lengths fail with an `InvalidKey`
 * reason. Bytes that do not encode a curve point are not rejected: no
 * signature verifies under them.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromRaw = (bytes: Uint8Array): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  bytes.length === 32
    ? Effect.succeed(new Uint8Array(bytes) as PublicKey)
    : Effect.fail(
      new CryptoError.CryptoError({
        module: "Ed25519",
        method: "publicKeyFromRaw",
        reason: new CryptoError.InvalidKey({ description: "Ed25519 public keys must contain exactly 32 bytes" })
      })
    )

// RFC 8410: the PKCS8 header of a 32-byte Ed25519 private key, which Web
// Crypto exports as the header followed by the key.
const ed25519Pkcs8Header = Uint8Array.of(48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32)

/**
 * Creates an Ed25519 private key from its 32 raw bytes, the RFC 8032 private
 * key that SSH and libsodium call the seed.
 *
 * **Details**
 *
 * Other lengths fail with an `InvalidKey` reason.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const privateKeyFromRaw = (
  bytes: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<PrivateKey, CryptoError.CryptoError> => {
  const raw = Redacted.isRedacted(bytes) ? Redacted.value(bytes) : bytes
  if (raw.length !== 32) {
    return Effect.fail(
      new CryptoError.CryptoError({
        module: "Ed25519",
        method: "privateKeyFromRaw",
        reason: new CryptoError.InvalidKey({ description: "Ed25519 private keys must contain exactly 32 bytes" })
      })
    )
  }
  const pkcs8 = new Uint8Array(ed25519Pkcs8Header.length + 32)
  pkcs8.set(ed25519Pkcs8Header)
  pkcs8.set(raw, ed25519Pkcs8Header.length)
  return Effect.succeed(Redacted.make(pkcs8) as PrivateKey)
}

/**
 * Returns the 32 raw bytes of an Ed25519 private key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const privateKeyToRaw = (
  key: PrivateKey
): Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError> => {
  const pkcs8 = Redacted.value(key)
  return pkcs8.length === ed25519Pkcs8Header.length + 32 && ed25519Pkcs8Header.every((byte, i) => pkcs8[i] === byte)
    ? Effect.succeed(Redacted.make(pkcs8.slice(ed25519Pkcs8Header.length)))
    : Effect.fail(
      new CryptoError.CryptoError({
        module: "Ed25519",
        method: "privateKeyToRaw",
        reason: new CryptoError.InvalidKey({ description: "Expected Ed25519 PKCS8 in the form Web Crypto exports" })
      })
    )
}

/**
 * Creates an Ed25519 private key from PKCS8 bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const privateKeyFromPkcs8 = (
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<PrivateKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const bytes = Redacted.isRedacted(pkcs8) ? Redacted.value(pkcs8) : pkcs8
        const handle = await subtle.importKey("pkcs8", bytes as BufferSource, "Ed25519", true, ["sign"])
        return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as PrivateKey
      },
      catch: (cause) => WebCrypto.webCryptoError("Ed25519", "privateKeyFromPkcs8", cause)
    }))

/**
 * Creates an Ed25519 private key from a private `OKP` JSON Web Key with `d`
 * and `x`.
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
export const privateKeyFromJwk = (jwk: JsonWebKey): Effect.Effect<PrivateKey, CryptoError.CryptoError> =>
  // Web Crypto rejects a public JWK as a usage error, not a key error.
  jwk.d === undefined
    ? Effect.fail(
      new CryptoError.CryptoError({
        module: "Ed25519",
        method: "privateKeyFromJwk",
        reason: new CryptoError.InvalidKey({ description: "Expected a private JWK with d" })
      })
    )
    : Effect.flatMap(WebCrypto.subtle, (subtle) =>
      Effect.tryPromise({
        try: async () => {
          // Web Crypto would check these JOSE members against the import parameters.
          const { alg, use, key_ops, ext, ...material } = jwk
          const handle = await subtle.importKey("jwk", material, "Ed25519", true, ["sign"])
          return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as PrivateKey
        },
        catch: (cause) => WebCrypto.webCryptoError("Ed25519", "privateKeyFromJwk", cause)
      }))

/**
 * Creates an Ed25519 public key from SPKI bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromSpki = (spki: Uint8Array): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("spki", spki as BufferSource, "Ed25519", true, [])
        return new Uint8Array(await subtle.exportKey("raw", handle)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("Ed25519", "publicKeyFromSpki", cause)
    }))

/**
 * Creates an Ed25519 public key from an `OKP` JSON Web Key.
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
export const publicKeyFromJwk = (jwk: JsonWebKey): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        // Web Crypto would check these JOSE members against the import parameters.
        const { alg, use, key_ops, ext, d, ...material } = jwk
        const handle = await subtle.importKey("jwk", material, "Ed25519", true, [])
        return new Uint8Array(await subtle.exportKey("raw", handle)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("Ed25519", "publicKeyFromJwk", cause)
    }))

/**
 * Computes the public key of an Ed25519 private key.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromPrivateKey = (privateKey: PrivateKey): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        // Web Crypto cannot export the public key of a private key, so the
        // public members of its JWK export are imported as a public key.
        const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), "Ed25519", true, ["sign"])
        const { d, ...publicJwk } = await subtle.exportKey("jwk", handle)
        const publicKey = await subtle.importKey("jwk", publicJwk, "Ed25519", true, [])
        return new Uint8Array(await subtle.exportKey("raw", publicKey)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("Ed25519", "publicKeyFromPrivateKey", cause)
    }))

/**
 * Encodes an Ed25519 public key as SPKI bytes.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const publicKeyToSpki = (key: PublicKey): Effect.Effect<Uint8Array, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("raw", key, "Ed25519", true, [])
        return new Uint8Array(await subtle.exportKey("spki", handle))
      },
      catch: (cause) => WebCrypto.webCryptoError("Ed25519", "publicKeyToSpki", cause)
    }))

/**
 * Encodes an Ed25519 public key as an `OKP` JSON Web Key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const publicKeyToJwk = (key: PublicKey): Effect.Effect<JsonWebKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("raw", key, "Ed25519", true, [])
        const { alg, key_ops, ext, ...jwk } = await subtle.exportKey("jwk", handle)
        return jwk
      },
      catch: (cause) => WebCrypto.webCryptoError("Ed25519", "publicKeyToJwk", cause)
    }))

/**
 * Layer that provides `Ed25519` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Ed25519, CryptoError.CryptoError> = Layer.effect(
  Ed25519,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtle
    return {
      generateKeyPair: () =>
        Effect.tryPromise({
          try: async () => {
            const pair = await subtle.generateKey("Ed25519", true, ["sign", "verify"]) as CryptoKeyPair
            return {
              privateKey: Redacted.make(
                new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))
              ) as PrivateKey,
              publicKey: new Uint8Array(await subtle.exportKey("raw", pair.publicKey)) as PublicKey
            }
          },
          catch: (cause) => WebCrypto.webCryptoError("Ed25519", "generateKeyPair", cause)
        }),
      sign: ({ data, privateKey }) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), "Ed25519", false, ["sign"])
            return new Uint8Array(await subtle.sign("Ed25519", handle, data as BufferSource))
          },
          catch: (cause) => WebCrypto.webCryptoError("Ed25519", "sign", cause)
        }),
      verify: ({ data, publicKey, signature }) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey("raw", publicKey, "Ed25519", false, ["verify"])
            return await subtle.verify("Ed25519", handle, signature as BufferSource, data as BufferSource)
          },
          catch: (cause) => WebCrypto.webCryptoError("Ed25519", "verify", cause)
        })
    }
  })
)
