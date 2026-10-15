/**
 * RSA: RSA-PSS and RSASSA-PKCS1-v1_5 signatures, RSA-OAEP encryption, and RSA
 * keys and their encodings.
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
 * An RSA private key: `Redacted` PKCS8 bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type PrivateKey = Redacted.Redacted<Uint8Array<ArrayBuffer>> & Brand.Brand<"RsaPrivateKey">

/**
 * An RSA public key: SPKI bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type PublicKey = Uint8Array<ArrayBuffer> & Brand.Brand<"RsaPublicKey">

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
export interface KeyPairOptions {
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
 * a `DecryptionFailed` reason. Verification returns `false` for a
 * mismatched signature.
 *
 * **Gotchas**
 *
 * Prefer RSA-PSS for new signatures. RSASSA-PKCS1-v1_5 is for protocols that
 * require it, such as `RS256` JWTs and SSH `rsa-sha2-*` host keys. RSA-OAEP
 * plaintext must fit in one RSA block: at most the modulus length minus twice
 * the hash length minus 2 bytes. Longer plaintext fails with an `InvalidArgument`
 * reason.
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
    options?: KeyPairOptions
  ) => Effect.Effect<{ readonly privateKey: PrivateKey; readonly publicKey: PublicKey }, CryptoError.CryptoError>
  /**
   * Signs data with RSA-PSS.
   */
  readonly signPss: (options: {
    readonly privateKey: PrivateKey
    readonly hash: HashAlgorithm
    readonly saltLength?: number | undefined
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Verifies an RSA-PSS signature over data.
   */
  readonly verifyPss: (options: {
    readonly publicKey: PublicKey
    readonly hash: HashAlgorithm
    readonly saltLength?: number | undefined
    readonly signature: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError.CryptoError>
  /**
   * Signs data with RSASSA-PKCS1-v1_5.
   */
  readonly signPkcs1v15: (options: {
    readonly privateKey: PrivateKey
    readonly hash: HashAlgorithm
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Verifies an RSASSA-PKCS1-v1_5 signature over data.
   */
  readonly verifyPkcs1v15: (options: {
    readonly publicKey: PublicKey
    readonly hash: HashAlgorithm
    readonly signature: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError.CryptoError>
  /**
   * Encrypts plaintext with RSA-OAEP.
   */
  readonly encryptOaep: (options: {
    readonly publicKey: PublicKey
    readonly hash: HashAlgorithm
    readonly data: Uint8Array
    readonly label?: Uint8Array | undefined
  }) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Decrypts RSA-OAEP ciphertext.
   */
  readonly decryptOaep: (options: {
    readonly privateKey: PrivateKey
    readonly hash: HashAlgorithm
    readonly data: Uint8Array
    readonly label?: Uint8Array | undefined
  }) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
}>()("effect/crypto/Rsa") {}

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
export const privateKeyFromPkcs8 = (
  pkcs8: Uint8Array | Redacted.Redacted<Uint8Array>
): Effect.Effect<PrivateKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const bytes = Redacted.isRedacted(pkcs8) ? Redacted.value(pkcs8) : pkcs8
        const handle = await subtle.importKey("pkcs8", bytes as BufferSource, rsaParams("RSA-PSS"), true, ["sign"])
        return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as PrivateKey
      },
      catch: (cause) => WebCrypto.webCryptoError("RSA", "privateKeyFromPkcs8", cause)
    }))

/**
 * Creates an RSA private key from a private two-prime `RSA` JSON Web Key.
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
        module: "RSA",
        method: "privateKeyFromJwk",
        reason: new CryptoError.InvalidKey({ description: "Expected a private JWK with d" })
      })
    )
    : Effect.flatMap(WebCrypto.subtle, (subtle) =>
      Effect.tryPromise({
        try: async () => {
          // Web Crypto would check these JOSE members against the import parameters.
          const { alg, use, key_ops, ext, ...material } = jwk
          const handle = await subtle.importKey("jwk", material, rsaParams("RSA-PSS"), true, ["sign"])
          return Redacted.make(new Uint8Array(await subtle.exportKey("pkcs8", handle))) as PrivateKey
        },
        catch: (cause) => WebCrypto.webCryptoError("RSA", "privateKeyFromJwk", cause)
      }))

/**
 * Creates an RSA public key from SPKI bytes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromSpki = (spki: Uint8Array): Effect.Effect<PublicKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("spki", spki as BufferSource, rsaParams("RSA-PSS"), true, [])
        return new Uint8Array(await subtle.exportKey("spki", handle)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("RSA", "publicKeyFromSpki", cause)
    }))

/**
 * Creates an RSA public key from an `RSA` JSON Web Key.
 *
 * **Details**
 *
 * The public key of a private JWK is read without its private members.
 * `alg`, `use`, and `key_ops` are not checked.
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
        const { alg, use, key_ops, ext, d, p, q, dp, dq, qi, oth, ...material } = jwk
        const handle = await subtle.importKey("jwk", material, rsaParams("RSA-PSS"), true, [])
        return new Uint8Array(await subtle.exportKey("spki", handle)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("RSA", "publicKeyFromJwk", cause)
    }))

/**
 * Computes the public key of an RSA private key.
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
        const handle = await subtle.importKey("pkcs8", Redacted.value(privateKey), rsaParams("RSA-PSS"), true, [
          "sign"
        ])
        const { d, p, q, dp, dq, qi, oth, ...publicJwk } = await subtle.exportKey("jwk", handle)
        const publicKey = await subtle.importKey("jwk", publicJwk, rsaParams("RSA-PSS"), true, [])
        return new Uint8Array(await subtle.exportKey("spki", publicKey)) as PublicKey
      },
      catch: (cause) => WebCrypto.webCryptoError("RSA", "publicKeyFromPrivateKey", cause)
    }))

/**
 * Returns the modulus length of an RSA public key in bits, for enforcing a
 * minimum key size.
 *
 * @stability unstable
 * @category getters
 * @since 4.0.0
 */
export const modulusLength = (publicKey: PublicKey): Effect.Effect<number, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("spki", publicKey, rsaParams("RSA-PSS"), false, ["verify"])
        return (handle.algorithm as RsaHashedKeyAlgorithm).modulusLength
      },
      catch: (cause) => WebCrypto.webCryptoError("RSA", "modulusLength", cause)
    }))

/**
 * Encodes an RSA public key as an `RSA` JSON Web Key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const publicKeyToJwk = (key: PublicKey): Effect.Effect<JsonWebKey, CryptoError.CryptoError> =>
  Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        const handle = await subtle.importKey("spki", key, rsaParams("RSA-PSS"), true, [])
        const { alg, key_ops, ext, ...jwk } = await subtle.exportKey("jwk", handle)
        return jwk
      },
      catch: (cause) => WebCrypto.webCryptoError("RSA", "publicKeyToJwk", cause)
    }))

// Output sizes in bytes.
const hashLengths: Record<HashAlgorithm, number> = {
  "SHA-1": 20,
  "SHA-256": 32,
  "SHA-384": 48,
  "SHA-512": 64
}

/**
 * Layer that provides `Rsa` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Rsa, CryptoError.CryptoError> = Layer.effect(
  Rsa,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtle
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
        readonly privateKey: PrivateKey
        readonly hash: HashAlgorithm
        readonly data: Uint8Array
      }
    ) =>
      Effect.tryPromise({
        try: async () => {
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
        },
        catch: (cause) => WebCrypto.webCryptoError(algorithm, method, cause)
      })
    const verify =
      (algorithm: string, method: string, params: AlgorithmIdentifier | RsaPssParams) =>
      ({ data, hash, publicKey, signature }: {
        readonly publicKey: PublicKey
        readonly hash: HashAlgorithm
        readonly signature: Uint8Array
        readonly data: Uint8Array
      }) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey("spki", publicKey, rsaParams(algorithm, hash), false, ["verify"])
            return await subtle.verify(params, handle, signature as BufferSource, data as BufferSource)
          },
          catch: (cause) => WebCrypto.webCryptoError(algorithm, method, cause)
        })
    return {
      generateKeyPair: (options) => {
        const params: RsaHashedKeyGenParams = {
          ...rsaParams("RSA-PSS"),
          modulusLength: options?.modulusLength ?? 2048,
          publicExponent: (options?.publicExponent ?? Uint8Array.of(1, 0, 1)) as Uint8Array<ArrayBuffer>
        }
        return Effect.tryPromise({
          try: async () => {
            const pair = await subtle.generateKey(params, true, ["sign", "verify"])
            return {
              privateKey: Redacted.make(
                new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))
              ) as PrivateKey,
              publicKey: new Uint8Array(await subtle.exportKey("spki", pair.publicKey)) as PublicKey
            }
          },
          catch: (cause) => WebCrypto.webCryptoError("RSA", "generateKeyPair", cause)
        })
      },
      signPss: (options) => sign("RSA-PSS", "signPss", pss(options.hash, options.saltLength))(options),
      verifyPss: (options) => verify("RSA-PSS", "verifyPss", pss(options.hash, options.saltLength))(options),
      signPkcs1v15: sign("RSASSA-PKCS1-v1_5", "signPkcs1v15", "RSASSA-PKCS1-v1_5"),
      verifyPkcs1v15: verify("RSASSA-PKCS1-v1_5", "verifyPkcs1v15", "RSASSA-PKCS1-v1_5"),
      encryptOaep: ({ data, hash, label, publicKey }) => {
        const params = oaep(label)
        // The key is imported separately, so an `OperationError` from the
        // import is not mistaken for plaintext that is too long.
        return Effect.tryPromise({
          try: () => subtle.importKey("spki", publicKey, rsaParams("RSA-OAEP", hash), false, ["encrypt"]),
          catch: (cause) => WebCrypto.webCryptoError("RSA-OAEP", "encryptOaep", cause)
        }).pipe(Effect.flatMap((handle) =>
          Effect.tryPromise({
            try: async () => new Uint8Array(await subtle.encrypt(params, handle, data as BufferSource)),
            catch: (cause) =>
              WebCrypto.isOperationError(cause)
                ? new CryptoError.CryptoError({
                  module: "RSA-OAEP",
                  method: "encryptOaep",
                  reason: new CryptoError.InvalidArgument({
                    description: "Plaintext is too long for the key and hash",
                    cause
                  })
                })
                : WebCrypto.webCryptoError("RSA-OAEP", "encryptOaep", cause)
          })
        ))
      },
      decryptOaep: ({ data, hash, label, privateKey }) => {
        const params = oaep(label)
        // The key is imported separately, so an `OperationError` from the
        // import is not mistaken for a failed decryption.
        return Effect.tryPromise({
          try: () =>
            subtle.importKey("pkcs8", Redacted.value(privateKey), rsaParams("RSA-OAEP", hash), false, ["decrypt"]),
          catch: (cause) => WebCrypto.webCryptoError("RSA-OAEP", "decryptOaep", cause)
        }).pipe(Effect.flatMap((handle) =>
          Effect.tryPromise({
            try: async () => new Uint8Array(await subtle.decrypt(params, handle, data as BufferSource)),
            catch: (cause) =>
              WebCrypto.isOperationError(cause)
                ? new CryptoError.CryptoError({
                  module: "RSA-OAEP",
                  method: "decryptOaep",
                  reason: new CryptoError.DecryptionFailed()
                })
                : WebCrypto.webCryptoError("RSA-OAEP", "decryptOaep", cause)
          })
        ))
      }
    }
  })
)
