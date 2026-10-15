/**
 * Digital signatures: Ed25519, ECDSA on P-256, P-384 and P-521, RSA-PSS, and
 * RSASSA-PKCS1-v1_5.
 *
 * The {@link Signature} service generates key pairs, signs, verifies, and
 * computes a private key's public key. The top-level {@link privateKey},
 * {@link publicKey}, {@link privateKeyFromCryptoKey},
 * {@link publicKeyFromCryptoKey}, and {@link toBytes} functions build and
 * export keys without a service.
 *
 * The hash is part of the algorithm. ECDSA P-256, P-384 and P-521 sign with
 * SHA-256, SHA-384 and SHA-512, as JOSE ES256, ES384 and ES512 do. RSA
 * algorithms come from {@link rsaPss} and {@link rsaPkcs1v15}, with pre-made
 * values such as {@link rsaPssSha256}.
 *
 * Keys are opaque. They hold either bytes or a `CryptoKey`, display only their
 * algorithm, and compare by reference. The bytes are:
 *
 * - Ed25519: the 32-byte seed and the 32-byte public key;
 * - ECDSA: PKCS#8 for private keys, and the uncompressed SEC1 point for public
 *   keys;
 * - RSA: PKCS#8 and SPKI DER.
 *
 * Only Ed25519 private keys and Ed25519 and ECDSA public keys have a raw
 * constructor. Other keys come from `Signature.generateKeyPair`,
 * `CryptoKey`s, or key formats.
 *
 * **Gotchas**
 *
 * - Ed25519 needs Chrome 137, Firefox 129, or Safari 17. There is no
 *   fallback for older browsers.
 * - Ed25519 keys are generated from `SecureRandom` bytes, so a seeded
 *   `SecureRandom` reproduces them. ECDSA and RSA key generation, and ECDSA
 *   and RSA-PSS signatures, use WebCrypto's own randomness and cannot be
 *   seeded. Test them with round trips such as `verify(sign(data))`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import type { Inspectable } from "../Inspectable.ts"
import * as Layer from "../Layer.ts"
import * as Predicate from "../Predicate.ts"
import * as CryptoError from "./CryptoError.ts"
import * as Digest from "./Digest.ts"
import * as Asymmetric from "./internal/asymmetric.ts"
import * as KeyModel from "./internal/key.ts"
import * as SecureRandom from "./SecureRandom.ts"
import { WebCrypto } from "./WebCrypto.ts"

const PrivateKeyTypeId = "~effect/crypto/Signature/PrivateKey" as const
const PublicKeyTypeId = "~effect/crypto/Signature/PublicKey" as const

/**
 * An elliptic curve for ECDSA.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Curve = "P-256" | "P-384" | "P-521"

/**
 * The type-level members every signature algorithm carries.
 *
 * **Details**
 *
 * `~flags` and `~keys` exist only in the types. They record whether private
 * and public keys have a raw form, that the algorithm runs on
 * `crypto.subtle`, and which key types the algorithm produces.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Phantom<RawPrivate extends boolean, RawPublic extends boolean> {
  readonly "~flags"?:
    | { readonly rawPrivate: RawPrivate; readonly rawPublic: RawPublic; readonly native: true }
    | undefined
  readonly "~keys"?:
    | { readonly privateKey: PrivateKey<Algorithm>; readonly publicKey: PublicKey<Algorithm> }
    | undefined
}

/**
 * Ed25519 (RFC 8032), with 64-byte signatures.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Ed25519 extends Phantom<true, true> {
  readonly _tag: "Ed25519"
  readonly name: "ed25519"
}

/**
 * ECDSA on a NIST curve, with the curve's hash and raw `r‖s` signatures.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Ecdsa<C extends Curve = Curve> extends Phantom<false, true> {
  readonly _tag: "Ecdsa"
  readonly name: { readonly "P-256": "ecdsaP256"; readonly "P-384": "ecdsaP384"; readonly "P-521": "ecdsaP521" }[C]
  readonly namedCurve: C
  readonly hash: Digest.Algorithm
}

/**
 * RSA-PSS (RFC 8017), from {@link rsaPss}.
 *
 * **Details**
 *
 * `modulusLength` is in bits and is only read by key generation: imported keys
 * keep their own size. `saltLength` is in bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RsaPss extends Phantom<false, false> {
  readonly _tag: "RsaPss"
  readonly name: string
  readonly hash: Digest.Algorithm
  readonly modulusLength: number
  readonly saltLength: number
}

/**
 * RSASSA-PKCS1-v1_5 (RFC 8017), from {@link rsaPkcs1v15}.
 *
 * **Details**
 *
 * `modulusLength` is in bits and is only read by key generation: imported keys
 * keep their own size.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RsaPkcs1v15 extends Phantom<false, false> {
  readonly _tag: "RsaPkcs1v15"
  readonly name: string
  readonly hash: Digest.Algorithm
  readonly modulusLength: number
}

/**
 * A signature algorithm, such as {@link ed25519} or {@link ecdsaP256}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Algorithm = Ed25519 | Ecdsa | RsaPss | RsaPkcs1v15

/**
 * Ed25519 (RFC 8032).
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const ed25519: Ed25519 = { _tag: "Ed25519", name: "ed25519" }

/**
 * ECDSA on P-256 with SHA-256 (JOSE ES256), with 64-byte signatures.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const ecdsaP256: Ecdsa<"P-256"> = { _tag: "Ecdsa", name: "ecdsaP256", namedCurve: "P-256", hash: Digest.sha256 }

/**
 * ECDSA on P-384 with SHA-384 (JOSE ES384), with 96-byte signatures.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const ecdsaP384: Ecdsa<"P-384"> = { _tag: "Ecdsa", name: "ecdsaP384", namedCurve: "P-384", hash: Digest.sha384 }

/**
 * ECDSA on P-521 with SHA-512 (JOSE ES512), with 132-byte signatures.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const ecdsaP521: Ecdsa<"P-521"> = { _tag: "Ecdsa", name: "ecdsaP521", namedCurve: "P-521", hash: Digest.sha512 }

const hashName = (hash: Digest.Algorithm): string =>
  hash.name.charAt(0) + hash.name.slice(1).toLowerCase().replace("-", "")

/**
 * Builds an RSA-PSS algorithm for a hash and a modulus length in bits.
 *
 * **Details**
 *
 * MGF1 uses the same hash. The salt length defaults to the hash's output
 * length.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const rsaPss = (options: {
  readonly hash: Digest.Algorithm
  readonly modulusLength: number
  readonly saltLength?: number | undefined
}): RsaPss => ({
  _tag: "RsaPss",
  name: `rsaPss${hashName(options.hash)}`,
  hash: options.hash,
  modulusLength: options.modulusLength,
  saltLength: options.saltLength ?? options.hash.outputLength
})

/**
 * Builds an RSASSA-PKCS1-v1_5 algorithm for a hash and a modulus length in
 * bits.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const rsaPkcs1v15 = (options: {
  readonly hash: Digest.Algorithm
  readonly modulusLength: number
}): RsaPkcs1v15 => ({
  _tag: "RsaPkcs1v15",
  name: `rsaPkcs1v15${hashName(options.hash)}`,
  hash: options.hash,
  modulusLength: options.modulusLength
})

/**
 * RSA-PSS with SHA-256 (JOSE PS256), generating 3072-bit keys.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const rsaPssSha256: RsaPss = rsaPss({ hash: Digest.sha256, modulusLength: 3072 })

/**
 * RSA-PSS with SHA-384 (JOSE PS384), generating 3072-bit keys.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const rsaPssSha384: RsaPss = rsaPss({ hash: Digest.sha384, modulusLength: 3072 })

/**
 * RSA-PSS with SHA-512 (JOSE PS512), generating 3072-bit keys.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const rsaPssSha512: RsaPss = rsaPss({ hash: Digest.sha512, modulusLength: 3072 })

/**
 * RSASSA-PKCS1-v1_5 with SHA-256 (JOSE RS256), generating 3072-bit keys.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const rsaPkcs1v15Sha256: RsaPkcs1v15 = rsaPkcs1v15({ hash: Digest.sha256, modulusLength: 3072 })

/**
 * RSASSA-PKCS1-v1_5 with SHA-384 (JOSE RS384), generating 3072-bit keys.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const rsaPkcs1v15Sha384: RsaPkcs1v15 = rsaPkcs1v15({ hash: Digest.sha384, modulusLength: 3072 })

/**
 * RSASSA-PKCS1-v1_5 with SHA-512 (JOSE RS512), generating 3072-bit keys.
 *
 * @stability unstable
 * @category algorithms
 * @since 4.0.0
 */
export const rsaPkcs1v15Sha512: RsaPkcs1v15 = rsaPkcs1v15({ hash: Digest.sha512, modulusLength: 3072 })

/**
 * An opaque signing key for the algorithm `A`.
 *
 * **Details**
 *
 * The key holds either bytes or a `CryptoKey` from
 * {@link privateKeyFromCryptoKey}. `toString`, `toJSON`, and `inspect` show
 * only the algorithm. Keys compare by reference and do not implement `Equal`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface PrivateKey<out A extends Algorithm = Algorithm> extends Inspectable {
  readonly [PrivateKeyTypeId]: typeof PrivateKeyTypeId
  readonly algorithm: A
}

/**
 * An opaque verification key for the algorithm `A`.
 *
 * **Details**
 *
 * The key holds either bytes or a `CryptoKey` from
 * {@link publicKeyFromCryptoKey}. Keys compare by reference and do not
 * implement `Equal`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface PublicKey<out A extends Algorithm = Algorithm> extends Inspectable {
  readonly [PublicKeyTypeId]: typeof PublicKeyTypeId
  readonly algorithm: A
}

/**
 * A private key and its public key.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface KeyPair<out A extends Algorithm = Algorithm> {
  readonly privateKey: PrivateKey<A>
  readonly publicKey: PublicKey<A>
}

const PrivateKeyProto = KeyModel.redactedProto(PrivateKeyTypeId, "Signature.PrivateKey")
const PublicKeyProto = KeyModel.redactedProto(PublicKeyTypeId, "Signature.PublicKey")

/**
 * Checks whether a value is a {@link PrivateKey}.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isPrivateKey = (u: unknown): u is PrivateKey => Predicate.hasProperty(u, PrivateKeyTypeId)

/**
 * Checks whether a value is a {@link PublicKey}.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isPublicKey = (u: unknown): u is PublicKey => Predicate.hasProperty(u, PublicKeyTypeId)

const specOf = (algorithm: Algorithm): Asymmetric.Spec => {
  const base = { privateUsages: ["sign"], publicUsages: ["verify"] } as const
  switch (algorithm._tag) {
    case "Ed25519":
      return {
        ...base,
        name: "Ed25519",
        importParams: { name: "Ed25519" },
        seedPrefix: Asymmetric.ed25519Prefix,
        publicFormat: "raw"
      }
    case "Ecdsa":
      return {
        ...base,
        name: "ECDSA",
        importParams: { name: "ECDSA", namedCurve: algorithm.namedCurve },
        seedPrefix: undefined,
        publicFormat: "raw",
        check: Asymmetric.checkNamedCurve(algorithm.namedCurve)
      }
    case "RsaPss":
    case "RsaPkcs1v15": {
      const name = algorithm._tag === "RsaPss" ? "RSA-PSS" : "RSASSA-PKCS1-v1_5"
      return {
        ...base,
        name,
        importParams: { name, hash: algorithm.hash.name },
        seedPrefix: undefined,
        publicFormat: "spki",
        check: Asymmetric.checkHash(algorithm.hash.name)
      }
    }
  }
}

const signParams = (algorithm: Algorithm): AlgorithmIdentifier | EcdsaParams | RsaPssParams => {
  switch (algorithm._tag) {
    case "Ed25519":
      return { name: "Ed25519" }
    case "Ecdsa":
      return { name: "ECDSA", hash: algorithm.hash.name }
    case "RsaPss":
      return { name: "RSA-PSS", saltLength: algorithm.saltLength }
    case "RsaPkcs1v15":
      return { name: "RSASSA-PKCS1-v1_5" }
  }
}

const generateParams = (algorithm: Algorithm): AlgorithmIdentifier | EcKeyGenParams | RsaHashedKeyGenParams => {
  switch (algorithm._tag) {
    case "Ed25519":
      return { name: "Ed25519" }
    case "Ecdsa":
      return { name: "ECDSA", namedCurve: algorithm.namedCurve }
    case "RsaPss":
    case "RsaPkcs1v15":
      return {
        ...specOf(algorithm).importParams as RsaHashedImportParams,
        modulusLength: algorithm.modulusLength,
        publicExponent: Uint8Array.of(1, 0, 1)
      }
  }
}

// The length of the algorithm's signatures, which for RSA is the size of the
// key's modulus. A signature of another length is rejected without asking
// WebCrypto, so every runtime returns `false` for it.
const signatureLength = (algorithm: Algorithm, cryptoKey: CryptoKey): number => {
  switch (algorithm._tag) {
    case "Ed25519":
      return 64
    case "Ecdsa":
      return 2 * Asymmetric.coordinateSizes[algorithm.namedCurve]
    case "RsaPss":
    case "RsaPkcs1v15":
      return Math.ceil((cryptoKey.algorithm as RsaHashedKeyAlgorithm).modulusLength / 8)
  }
}

// RFC 8017, section 9.1.1: the encoded message must fit the hash, the salt
// and two more bytes.
const checkSaltLength = (algorithm: Algorithm, cryptoKey: CryptoKey): string | undefined => {
  if (algorithm._tag !== "RsaPss") return undefined
  const modulusLength = (cryptoKey.algorithm as RsaHashedKeyAlgorithm).modulusLength
  const encodedLength = Math.ceil((modulusLength - 1) / 8)
  return algorithm.hash.outputLength + algorithm.saltLength + 2 <= encodedLength
    ? undefined
    : `A ${algorithm.saltLength}-byte PSS salt does not fit a ${modulusLength}-bit key with ${algorithm.hash.name}`
}

class SaltLengthError extends Error {}

/**
 * Service that generates key pairs, signs, verifies, and computes public keys.
 *
 * **Example** (Signing and verifying with Ed25519)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer } from "effect"
 * import { SecureRandom, Signature } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const signature = yield* Signature.Signature
 *   const { privateKey, publicKey } = yield* signature.generateKeyPair(Signature.ed25519)
 *   const data = new TextEncoder().encode("message")
 *   const signed = yield* signature.sign(privateKey, data)
 *   return [signed.length, yield* signature.verify(publicKey, signed, data)]
 * })
 *
 * const layer = Signature.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
 * await Effect.runPromise(program.pipe(Effect.provide(layer))) // => [64, true]
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Signature extends Context.Service<Signature, {
  /**
   * Generates a key pair. Ed25519 private keys are 32 bytes from
   * `SecureRandom`. ECDSA and RSA keys are generated by WebCrypto and exported
   * to PKCS#8 and to an uncompressed point or SPKI.
   */
  readonly generateKeyPair: <A extends Algorithm>(algorithm: A) => Effect.Effect<KeyPair<A>, CryptoError.CryptoError>
  /**
   * Signs `data`. ECDSA signatures are raw `r‖s`, each padded to the curve's
   * coordinate size.
   */
  readonly sign: (privateKey: PrivateKey, data: Uint8Array) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Checks `signature` against `data`. Any problem with the signature bytes,
   * such as a wrong length or an out-of-range `r` or `s`, returns `false`.
   * Only problems with the key or the layer fail.
   */
  readonly verify: (
    publicKey: PublicKey,
    signature: Uint8Array,
    data: Uint8Array
  ) => Effect.Effect<boolean, CryptoError.CryptoError>
  /**
   * Computes the public key of a private key. A non-extractable `CryptoKey`
   * fails with a `NotExtractable` reason, since its public members cannot be
   * read.
   */
  readonly publicKeyOf: <A extends Algorithm>(
    privateKey: PrivateKey<A>
  ) => Effect.Effect<PublicKey<A>, CryptoError.CryptoError>
}>()("effect/crypto/Signature") {}

/**
 * Layer that provides `Signature` on the `WebCrypto` reference.
 *
 * **Details**
 *
 * Every algorithm runs on `crypto.subtle`. The layer imports a byte-backed
 * key on first use and caches the `CryptoKey`. Ed25519 private keys come from
 * `SecureRandom`, so a seeded `SecureRandom` reproduces them.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebCrypto: Layer.Layer<Signature, never, SecureRandom.SecureRandom> = Layer.effect(
  Signature,
  Effect.gen(function*() {
    const random = yield* SecureRandom.SecureRandom
    const crypto = yield* WebCrypto
    const privateCryptoKey = KeyModel.makeCache((subtle, bytes, algorithm: Algorithm) =>
      Asymmetric.importPrivate(subtle, bytes, specOf(algorithm), false)
    )
    const publicCryptoKey = KeyModel.makeCache((subtle, bytes, algorithm: Algorithm) =>
      Asymmetric.importPublic(subtle, bytes, specOf(algorithm))
    )
    const argumentError = (method: string, cause: unknown) =>
      cause instanceof SaltLengthError
        ? new CryptoError.CryptoError({
          module: "Signature",
          method,
          reason: new CryptoError.InvalidArgument({ description: cause.message })
        })
        : undefined
    return Signature.of({
      generateKeyPair: <A extends Algorithm>(algorithm: A) =>
        Effect.flatMap(
          algorithm._tag === "Ed25519" ? random.randomBytes(Asymmetric.seedLength) : Effect.undefined,
          (seed) =>
            Effect.map(
              Asymmetric.run(
                "Signature",
                "generateKeyPair",
                crypto,
                (subtle) => Asymmetric.generate(subtle, specOf(algorithm), generateParams(algorithm), seed)
              ),
              ({ privateKey, publicKey }): KeyPair<A> => ({
                privateKey: KeyModel.make(PrivateKeyProto, algorithm, { _tag: "Bytes", bytes: privateKey }),
                publicKey: KeyModel.make(PublicKeyProto, algorithm, { _tag: "Bytes", bytes: publicKey })
              })
            )
        ),
      sign: (privateKey, data) =>
        Asymmetric.run(
          "Signature",
          "sign",
          crypto,
          async (subtle) => {
            const cryptoKey = await privateCryptoKey(subtle, privateKey)
            const problem = checkSaltLength(privateKey.algorithm, cryptoKey)
            if (problem !== undefined) throw new SaltLengthError(problem)
            return new Uint8Array(await subtle.sign(signParams(privateKey.algorithm), cryptoKey, data as BufferSource))
          },
          (cause) => argumentError("sign", cause) ?? Asymmetric.error("Signature", "sign", cause)
        ),
      verify: (publicKey, signature, data) =>
        Asymmetric.run(
          "Signature",
          "verify",
          crypto,
          async (subtle) => {
            const cryptoKey = await publicCryptoKey(subtle, publicKey)
            const problem = checkSaltLength(publicKey.algorithm, cryptoKey)
            if (problem !== undefined) throw new SaltLengthError(problem)
            if (signature.length !== signatureLength(publicKey.algorithm, cryptoKey)) return false
            return subtle.verify(
              signParams(publicKey.algorithm),
              cryptoKey,
              signature as BufferSource,
              data as BufferSource
            )
          },
          (cause) =>
            argumentError("verify", cause) ?? Asymmetric.publicKeyError("Signature", "verify", publicKey, cause)
        ),
      publicKeyOf: <A extends Algorithm>(privateKey: PrivateKey<A>) =>
        Asymmetric.publicKeyOf<PublicKey<A>>(
          "Signature",
          crypto,
          privateKey,
          specOf(privateKey.algorithm),
          PublicKeyProto
        )
    })
  })
)

/**
 * Builds an Ed25519 private key from its 32-byte seed.
 *
 * **Details**
 *
 * The bytes are copied. Another length fails with an `InvalidKey` reason,
 * including the 64-byte `seed‖public key` form libsodium and TweetNaCl use:
 * pass its first 32 bytes. ECDSA and RSA private keys have no raw form, so
 * passing them is a type error.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const privateKey = <
  A extends Algorithm & { readonly "~flags"?: { readonly rawPrivate: true } | undefined }
>(
  algorithm: A,
  bytes: Uint8Array
): Effect.Effect<PrivateKey<A>, CryptoError.CryptoError> =>
  Asymmetric.fromBytes(
    "Signature",
    "privateKey",
    PrivateKeyProto,
    algorithm,
    bytes,
    (bytes) => Asymmetric.checkSeedLength("Ed25519", "private")(bytes.length)
  )

/**
 * Builds a public key from its raw form: 32 bytes for Ed25519, or an
 * uncompressed SEC1 point for ECDSA.
 *
 * **Details**
 *
 * The bytes are copied. A wrong length, or a compressed point, fails with an
 * `InvalidKey` reason. Whether a point is on the curve is checked when the
 * key is first used. RSA public keys have no raw form, so passing them is a
 * type error.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKey = <
  A extends Algorithm & { readonly "~flags"?: { readonly rawPublic: true } | undefined }
>(
  algorithm: A,
  bytes: Uint8Array
): Effect.Effect<PublicKey<A>, CryptoError.CryptoError> =>
  Asymmetric.fromBytes(
    "Signature",
    "publicKey",
    PublicKeyProto,
    algorithm,
    bytes,
    algorithm._tag === "Ecdsa"
      ? Asymmetric.checkPoint(algorithm.namedCurve)
      : (bytes) => Asymmetric.checkSeedLength("Ed25519", "public")(bytes.length)
  )

/**
 * Builds a private key from an existing `CryptoKey`, such as a
 * non-extractable one.
 *
 * **Details**
 *
 * The `CryptoKey` must be a private key of the algorithm's WebCrypto name,
 * curve or hash, with the `sign` usage. Otherwise the constructor fails with
 * an `InvalidKey` reason. The modulus length of an RSA algorithm is not
 * checked. The key must come from the `Crypto` object of the `WebCrypto`
 * reference.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const privateKeyFromCryptoKey = <A extends Algorithm>(
  algorithm: A,
  cryptoKey: CryptoKey
): Effect.Effect<PrivateKey<A>, CryptoError.CryptoError> =>
  Asymmetric.fromCryptoKey(
    "Signature",
    "privateKeyFromCryptoKey",
    PrivateKeyProto,
    algorithm,
    specOf(algorithm),
    "private",
    cryptoKey
  )

/**
 * Builds a public key from an existing `CryptoKey`.
 *
 * **Details**
 *
 * The `CryptoKey` must be a public key of the algorithm's WebCrypto name,
 * curve or hash, with the `verify` usage. Otherwise the constructor fails
 * with an `InvalidKey` reason. The key must come from the `Crypto` object of
 * the `WebCrypto` reference.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const publicKeyFromCryptoKey = <A extends Algorithm>(
  algorithm: A,
  cryptoKey: CryptoKey
): Effect.Effect<PublicKey<A>, CryptoError.CryptoError> =>
  Asymmetric.fromCryptoKey(
    "Signature",
    "publicKeyFromCryptoKey",
    PublicKeyProto,
    algorithm,
    specOf(algorithm),
    "public",
    cryptoKey
  )

/**
 * Exports a key's stored bytes.
 *
 * **Details**
 *
 * Returns a fresh `Uint8Array`: the seed or raw public key for Ed25519,
 * PKCS#8 or the uncompressed point for ECDSA, and PKCS#8 or SPKI DER for
 * RSA. A `CryptoKey`-backed key is exported on the `WebCrypto` reference, and
 * fails with a `NotExtractable` reason when the `CryptoKey` is not
 * extractable.
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const toBytes = (key: PrivateKey | PublicKey): Effect.Effect<Uint8Array, CryptoError.CryptoError> =>
  Asymmetric.toBytes("Signature", key, specOf(key.algorithm), isPrivateKey(key) ? "private" : "public")
