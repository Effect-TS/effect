/**
 * JSON Web Keys and the algorithm-bound keys the other `effect/jose` modules
 * use.
 *
 * A key is imported for one algorithm and keeps it: a JWS or JWE operation
 * takes its algorithm from the key, so a token cannot pick another one. The
 * imported key wraps an `effect/crypto` key object, which redacts itself when
 * printed and caches its native key.
 *
 * Importing honours the JWK's `alg`, `use`, and `key_ops` members, and
 * rejects RSA keys shorter than 2048 bits.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Aead from "../crypto/Aead.ts"
import * as Digest from "../crypto/Digest.ts"
import * as KeyFormat from "../crypto/KeyFormat.ts"
import * as Mac from "../crypto/Mac.ts"
import * as Signature from "../crypto/Signature.ts"
import * as Effect from "../Effect.ts"
import * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import {
  cryptoFailure,
  decodeSegment,
  hasPrivateMembers,
  invalidArgument,
  invalidKey,
  noPrivateMembers,
  publicKeyFailure
} from "./internal/compact.ts"
import type { JoseError } from "./JoseError.ts"

/**
 * Schema for the asymmetric signature algorithms: RS256, PS256, ES256 (P-256),
 * and EdDSA (Ed25519).
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const AsymmetricAlgorithm = Schema.Literals(["RS256", "PS256", "ES256", "EdDSA"])

/**
 * An asymmetric signature algorithm.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type AsymmetricAlgorithm = typeof AsymmetricAlgorithm.Type

/**
 * Schema for the JWS algorithms: HS256 and the asymmetric algorithms.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Algorithm = Schema.Literals(["HS256", "RS256", "PS256", "ES256", "EdDSA"])

/**
 * A JWS algorithm.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Algorithm = typeof Algorithm.Type

/**
 * The algorithms of a symmetric key: HS256 signatures, or direct A256GCM
 * encryption.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type SecretAlgorithm = "HS256" | "dir"

const metadata = {
  kid: Schema.optionalKey(Schema.String),
  alg: Schema.optionalKey(Schema.String),
  use: Schema.optionalKey(Schema.String),
  key_ops: Schema.optionalKey(Schema.Array(Schema.String))
}

const rsa = { ...metadata, kty: Schema.Literal("RSA"), n: Schema.String, e: Schema.String }
const ec = { ...metadata, kty: Schema.Literal("EC"), crv: Schema.Literal("P-256"), x: Schema.String, y: Schema.String }
const okp = { ...metadata, kty: Schema.Literal("OKP"), crv: Schema.Literal("Ed25519"), x: Schema.String }

/**
 * Schema for an RSA, P-256, or Ed25519 public JWK. Private and symmetric
 * members, including RSA factors, are rejected.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PublicJwk = Schema.Union([
  Schema.Struct({ ...rsa, ...noPrivateMembers }),
  Schema.Struct({ ...ec, ...noPrivateMembers }),
  Schema.Struct({ ...okp, ...noPrivateMembers })
])

/**
 * An RSA, P-256, or Ed25519 public JWK.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PublicJwk = typeof PublicJwk.Type

/**
 * Schema for an RSA, P-256, or Ed25519 private JWK. RSA keys need their CRT
 * members and cannot have more than two primes.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PrivateJwk = Schema.Union([
  Schema.Struct({
    ...rsa,
    d: Schema.String,
    p: Schema.String,
    q: Schema.String,
    dp: Schema.String,
    dq: Schema.String,
    qi: Schema.String,
    oth: Schema.optionalKey(Schema.Never)
  }),
  Schema.Struct({ ...ec, d: Schema.String }),
  Schema.Struct({ ...okp, d: Schema.String })
])

/**
 * An RSA, P-256, or Ed25519 private JWK.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PrivateJwk = typeof PrivateJwk.Type

/**
 * Schema for an octet-sequence JWK.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const SecretJwk = Schema.Struct({ ...metadata, kty: Schema.Literal("oct"), k: Schema.String })

/**
 * An octet-sequence JWK.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type SecretJwk = typeof SecretJwk.Type

/**
 * A public key bound to one asymmetric algorithm, with the JWK it was imported
 * from.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface PublicKey {
  readonly _tag: "PublicKey"
  readonly algorithm: AsymmetricAlgorithm
  readonly kid: string | undefined
  readonly jwk: PublicJwk
  readonly key: Signature.PublicKey
}

/**
 * A private key bound to one asymmetric algorithm.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface PrivateKey {
  readonly _tag: "PrivateKey"
  readonly algorithm: AsymmetricAlgorithm
  readonly kid: string | undefined
  readonly key: Signature.PrivateKey
}

/**
 * A symmetric key bound to HS256 signatures or to direct A256GCM encryption.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface SecretKey<A extends SecretAlgorithm = SecretAlgorithm> {
  readonly _tag: "SecretKey"
  readonly algorithm: A
  readonly kid: string | undefined
  readonly key: A extends "HS256" ? Mac.Key : Aead.Key
}

/**
 * A key that signs JWS and JWT tokens.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type SigningKey = PrivateKey | SecretKey<"HS256">

/**
 * A key that verifies JWS and JWT tokens.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type VerificationKey = PublicKey | SecretKey<"HS256">

/**
 * A generated public JWK and its private JWK, both carrying `alg` and the
 * requested `kid`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface KeyPair {
  readonly publicKey: PublicJwk
  readonly privateKey: Redacted.Redacted<PrivateJwk>
}

/**
 * Options for {@link generateKeyPair}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface GenerateKeyPairOptions {
  readonly algorithm: AsymmetricAlgorithm
  readonly kid?: string | undefined
  /**
   * RSA modulus length in bits. Defaults to 2048 and must be at least 2048.
   */
  readonly modulusLength?: number | undefined
}

const signatureAlgorithm = (algorithm: AsymmetricAlgorithm, modulusLength = 2048): Signature.Algorithm => {
  switch (algorithm) {
    case "RS256":
      return Signature.rsaPkcs1v15({ hash: Digest.sha256, modulusLength })
    case "PS256":
      return Signature.rsaPss({ hash: Digest.sha256, modulusLength })
    case "ES256":
      return Signature.ecdsaP256
    case "EdDSA":
      return Signature.ed25519
  }
}

interface Metadata {
  readonly alg?: string | undefined
  readonly use?: string | undefined
  readonly key_ops?: ReadonlyArray<string> | undefined
}

// `operations` lists every operation the key performs here, so `key_ops` must
// allow all of them: a symmetric key both signs and verifies, or both encrypts
// and decrypts.
const checkMetadata = (
  jwk: Metadata,
  algorithm: string,
  use: "sig" | "enc",
  operations: ReadonlyArray<string>
): Effect.Effect<void, JoseError> => {
  if (jwk.alg !== undefined && jwk.alg !== algorithm) {
    return invalidKey(`The JWK is for ${jwk.alg}, not ${algorithm}`)
  }
  if (jwk.use !== undefined && jwk.use !== use) {
    return invalidKey(`The JWK use is ${jwk.use}, not ${use}`)
  }
  if (jwk.key_ops !== undefined && !operations.every((operation) => jwk.key_ops!.includes(operation))) {
    return invalidKey(`The JWK key_ops must allow ${operations.join(" and ")}`)
  }
  return Effect.void
}

// Checked on the imported key, whose algorithm carries the actual modulus.
const checkModulus = (key: Signature.PublicKey | Signature.PrivateKey): Effect.Effect<void, JoseError> =>
  (key.algorithm._tag === "RsaPss" || key.algorithm._tag === "RsaPkcs1v15") && key.algorithm.modulusLength < 2048
    ? invalidKey("RSA keys must have at least 2048 bits")
    : Effect.void

// KeyFormat reads and writes only the key members; JOSE metadata is checked
// and added here.
const jsonWebKey = (jwk: object): JsonWebKey => jwk

const exportJwk = (
  key: Signature.PrivateKey | Signature.PublicKey,
  algorithm: AsymmetricAlgorithm,
  kid: string | undefined
): Effect.Effect<object, JoseError> =>
  KeyFormat.encode(KeyFormat.jwk, key as KeyFormat.Key).pipe(
    Effect.mapBoth({
      onFailure: cryptoFailure("Could not export the key"),
      onSuccess: (jwk) => ({ ...jwk, ...(kid === undefined ? {} : { kid }), alg: algorithm })
    })
  )

/**
 * Generates a key pair for an asymmetric algorithm and returns it as JWKs.
 *
 * @see {@link importPrivate} for preparing the private JWK for signing
 * @see {@link importPublic} for preparing the public JWK for verification
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const generateKeyPair = Effect.fnUntraced(function*(
  options: GenerateKeyPairOptions
): Effect.fn.Return<KeyPair, JoseError, Signature.Signature> {
  const { algorithm, kid, modulusLength } = options
  if (modulusLength !== undefined && (!Number.isSafeInteger(modulusLength) || modulusLength < 2048)) {
    return yield* invalidArgument("modulusLength must be an integer of at least 2048")
  }
  const signature = yield* Signature.Signature
  const pair = yield* signature.generateKeyPair(signatureAlgorithm(algorithm, modulusLength)).pipe(
    Effect.mapError(cryptoFailure(`Could not generate a ${algorithm} key pair`))
  )
  const publicJwk = yield* exportJwk(pair.publicKey, algorithm, kid)
  const privateJwk = yield* exportJwk(pair.privateKey, algorithm, kid)
  return { publicKey: publicJwk as PublicJwk, privateKey: Redacted.make(privateJwk as PrivateJwk) }
})

/**
 * Imports a public JWK for an asymmetric algorithm.
 *
 * **Details**
 *
 * The key's family and curve must fit the algorithm, and any `alg`, `use`, or
 * `key_ops` member must allow verification with it. Private members are
 * rejected. To import untrusted JSON, decode it with {@link PublicJwk} first.
 *
 * @see {@link importPrivate}
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const importPublic = Effect.fnUntraced(function*(
  jwk: PublicJwk,
  algorithm: AsymmetricAlgorithm
): Effect.fn.Return<PublicKey, JoseError> {
  if (hasPrivateMembers(jwk)) return yield* invalidKey("A public JWK cannot contain private members")
  yield* checkMetadata(jwk, algorithm, "sig", ["verify"])
  const key = yield* KeyFormat.decodePublic(KeyFormat.jwk, signatureAlgorithm(algorithm), jsonWebKey(jwk)).pipe(
    Effect.mapError(publicKeyFailure)
  )
  yield* checkModulus(key)
  return { _tag: "PublicKey", algorithm, kid: jwk.kid, jwk, key }
})

/**
 * Imports a private JWK for an asymmetric algorithm.
 *
 * @see {@link importPkcs8} for importing DER-encoded keys
 * @see {@link exportPrivate}
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const importPrivate = Effect.fnUntraced(function*(
  input: Redacted.Redacted<PrivateJwk>,
  algorithm: AsymmetricAlgorithm
): Effect.fn.Return<PrivateKey, JoseError> {
  const jwk = Redacted.value(input)
  yield* checkMetadata(jwk, algorithm, "sig", ["sign"])
  const key = yield* KeyFormat.decodePrivate(KeyFormat.jwk, signatureAlgorithm(algorithm), jsonWebKey(jwk)).pipe(
    Effect.mapError(cryptoFailure(`Could not import the private JWK for ${algorithm}`))
  )
  yield* checkModulus(key)
  return { _tag: "PrivateKey", algorithm, kid: jwk.kid, key }
})

/**
 * Imports a PKCS#8 DER private key for an asymmetric algorithm.
 *
 * @see {@link importPrivate} for importing JWK-encoded keys
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const importPkcs8 = Effect.fnUntraced(function*(
  der: Redacted.Redacted<Uint8Array>,
  algorithm: AsymmetricAlgorithm,
  options?: { readonly kid?: string | undefined }
): Effect.fn.Return<PrivateKey, JoseError> {
  const key = yield* KeyFormat.decodePrivate(KeyFormat.pkcs8, signatureAlgorithm(algorithm), Redacted.value(der)).pipe(
    Effect.mapError(cryptoFailure(`Could not import the PKCS#8 key for ${algorithm}`))
  )
  yield* checkModulus(key)
  return { _tag: "PrivateKey", algorithm, kid: options?.kid, key }
})

/**
 * Imports an octet JWK for HS256 or for direct A256GCM encryption.
 *
 * **Details**
 *
 * HS256 keys need at least 32 bytes and `dir` keys exactly 32. Any `alg`,
 * `use`, or `key_ops` member must allow the algorithm; `key_ops` must allow
 * both of its operations.
 *
 * **Example** (Importing an HS256 key)
 *
 * ```ts import.meta.vitest
 * import { Effect, Redacted } from "effect"
 * import { Jwk } from "effect/jose"
 *
 * // Fixed public example material; generate application secrets securely.
 * const secret = Redacted.make({ kty: "oct", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" } as const)
 * const key = await Effect.runPromise(Jwk.importSecret(secret, "HS256"))
 * key.algorithm // => "HS256"
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const importSecret = Effect.fnUntraced(function*<A extends SecretAlgorithm>(
  input: Redacted.Redacted<SecretJwk>,
  algorithm: A
): Effect.fn.Return<SecretKey<A>, JoseError> {
  const jwk = Redacted.value(input)
  if (algorithm === "HS256") {
    yield* checkMetadata(jwk, algorithm, "sig", ["sign", "verify"])
  } else {
    yield* checkMetadata(jwk, algorithm, "enc", ["encrypt", "decrypt"])
  }
  const bytes = jwk.kty === "oct" ? decodeSegment(jwk.k) : undefined
  if (bytes === undefined) return yield* invalidKey("Expected an oct JWK with a base64url k member")
  if (algorithm === "HS256" ? bytes.length < 32 : bytes.length !== 32) {
    return yield* invalidKey(
      algorithm === "HS256" ? "HS256 keys must have at least 32 bytes" : "dir keys must have exactly 32 bytes"
    )
  }
  const failure = cryptoFailure(`Could not import the ${algorithm} key`)
  const key = algorithm === "HS256"
    ? yield* Effect.mapError(Mac.key(Mac.hmacSha256, bytes), failure)
    : yield* Effect.mapError(Aead.key(Aead.aes256Gcm, bytes), failure)
  return { _tag: "SecretKey", algorithm, kid: jwk.kid, key } as SecretKey<A>
})

/**
 * Exports a private key as a JWK carrying its `alg` and `kid`.
 *
 * @see {@link importPrivate}
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const exportPrivate = Effect.fnUntraced(function*(
  key: PrivateKey
): Effect.fn.Return<Redacted.Redacted<PrivateJwk>, JoseError> {
  const jwk = yield* exportJwk(key.key, key.algorithm, key.kid)
  return Redacted.make(jwk as PrivateJwk)
})
