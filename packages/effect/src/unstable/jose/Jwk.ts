/**
 * JSON Web Key (JWK) schemas based on RFC 7517 and RFC 7518 Section 6.
 *
 * This module provides Effect Schema definitions for representing
 * cryptographic keys as JSON objects, including key-type-specific parameters
 * for EC, RSA, and symmetric (oct) keys, as well as the JWK Set format.
 *
 * Binary-valued members (coordinates, exponents, key values) are kept in
 * their base64url wire form: they encode raw bytes, not UTF-8 text, and the
 * base64url form is exactly what `crypto.subtle.importKey("jwk", ...)`
 * expects.
 *
 * @since 4.0.0
 */
import * as Schema from "../../Schema.ts"
import { JwsAlgorithm } from "./Jwa.ts"

/**
 * JWK "kty" (Key Type) parameter values as defined in RFC 7518 Section 6.1.
 *
 * @category Key Type
 * @since 4.0.0
 */
export const KeyType = Schema.Literals([
  "EC", // Elliptic Curve [DSS] - Recommended+
  "RSA", // RSA [RFC3447] - Required
  "oct" // Octet sequence (symmetric keys) - Required
]).annotate({
  title: "JWK Key Type",
  expected: "the 'kty' parameter of a JWK, indicating the key type",
  description: "Cryptographic algorithm family used with the key as defined in RFC 7518 Section 6.1"
})

/**
 * JWK Public Key Use parameter values as defined in RFC 7517 Section 4.2.
 *
 * @category Key Use
 * @since 4.0.0
 */
export const KeyUse = Schema.Literals([
  "sig", // Digital Signature or MAC
  "enc" // Encryption
]).annotate({
  title: "Public Key Use",
  expected: "the 'use' parameter of a JWK, indicating the intended use of the key",
  description: "Intended use of the public key: signature or encryption"
})

/**
 * JWK Key Operations parameter values as defined in RFC 7517 Section 4.3.
 * These values intentionally match the Web Cryptography API KeyUsage values.
 *
 * @category Key Operations
 * @since 4.0.0
 */
export const KeyOperation = Schema.Literals([
  "sign", // Compute digital signature or MAC
  "verify", // Verify digital signature or MAC
  "encrypt", // Encrypt content
  "decrypt", // Decrypt content and validate decryption, if applicable
  "wrapKey", // Encrypt key
  "unwrapKey", // Decrypt key and validate decryption, if applicable
  "deriveKey", // Derive key
  "deriveBits" // Derive bits not to be used as a key
]).annotate({
  title: "Key Operation",
  expected: "the 'key_ops' parameter of a JWK, indicating the operations for which the key is intended to be used",
  description: "Operation for which the key is intended to be used as defined in RFC 7517 Section 4.3"
})

/**
 * JWK Curve parameter values for Elliptic Curve keys as defined in RFC 7518
 * Section 6.2.1.1.
 *
 * @category Elliptic Curve
 * @since 4.0.0
 */
export const EllipticCurve = Schema.Literals([
  "P-256", // NIST P-256 Curve - Recommended+
  "P-384", // NIST P-384 Curve - Optional
  "P-521" // NIST P-521 Curve - Optional
]).annotate({
  title: "Elliptic Curve",
  expected: "the 'crv' parameter of an EC JWK, indicating the curve used",
  description: "Cryptographic curve used with the key as defined in RFC 7518 Section 6.2.1.1"
})

/**
 * Common JWK parameters shared across all key types as defined in RFC 7517
 * Section 4.
 *
 * @internal
 */
const JwkCommonFields = Schema.Struct({
  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-4.2 */
  use: Schema.optional(KeyUse),

  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-4.3 */
  key_ops: Schema.optional(Schema.Array(KeyOperation)),

  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-4.4 */
  alg: Schema.optional(JwsAlgorithm),

  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-4.5 */
  kid: Schema.optional(Schema.String),

  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-4.6 */
  x5u: Schema.optional(Schema.String),

  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-4.7 */
  x5c: Schema.optional(Schema.Array(Schema.String)),

  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-4.8 */
  x5t: Schema.optional(Schema.String),

  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-4.9 */
  "x5t#S256": Schema.optional(Schema.String)
})

/**
 * An Elliptic Curve public key represented as a JWK.
 *
 * Members "kty", "crv", "x", and "y" are required for EC public keys.
 *
 * @category Elliptic Curve
 * @since 4.0.0
 */
export const EcPublicKey = Schema.Struct({
  /** Key Type — MUST be "EC" */
  kty: Schema.Literal("EC"),

  /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.2.1.1 */
  crv: EllipticCurve,

  /**
   * "x" (X Coordinate) Base64urlUInt-encoded x coordinate.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.2.1.2
   */
  x: Schema.String,

  /**
   * "y" (Y Coordinate) Base64urlUInt-encoded y coordinate.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.2.1.3
   */
  y: Schema.String,

  ...JwkCommonFields.fields
}).annotate({
  title: "EC Public Key",
  expected: "a JWK with 'kty' of 'EC' representing an Elliptic Curve public key",
  description: "An Elliptic Curve public key as defined in RFC 7518 Section 6.2.1"
})

/**
 * An Elliptic Curve private key represented as a JWK. Extends the public key
 * with the private key parameter "d".
 *
 * @category Elliptic Curve
 * @since 4.0.0
 */
export const EcPrivateKey = Schema.Struct({
  ...EcPublicKey.fields,

  /**
   * "d" (ECC Private Key) Base64urlUInt-encoded private key value.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.2.2.1
   */
  d: Schema.String
}).annotate({
  title: "EC Private Key",
  expected: "a JWK with 'kty' of 'EC' representing an Elliptic Curve private key",
  description: "An Elliptic Curve private key as defined in RFC 7518 Section 6.2.2"
})

/**
 * Represents information about additional primes (beyond the first two) in a
 * multi-prime RSA key.
 *
 * @internal
 */
const OtherPrimeInfo = Schema.Struct({
  /** "r" (Prime Factor) */
  r: Schema.String,

  /** "d" (Factor CRT Exponent) */
  d: Schema.String,

  /** "t" (Factor CRT Coefficient) */
  t: Schema.String
})

/**
 * An RSA public key represented as a JWK.
 *
 * Members "kty", "n", and "e" are required for RSA public keys.
 *
 * @category RSA
 * @since 4.0.0
 */
export const RsaPublicKey = Schema.Struct({
  /** Key Type — MUST be "RSA" */
  kty: Schema.Literal("RSA"),

  /**
   * "n" (Modulus) Base64urlUInt-encoded modulus value.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.1.1
   */
  n: Schema.String,

  /**
   * "e" (Exponent) Base64urlUInt-encoded exponent value.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.1.2
   */
  e: Schema.String,

  ...JwkCommonFields.fields
}).annotate({
  title: "RSA Public Key",
  expected: "a JWK with 'kty' of 'RSA' representing an RSA public key",
  description: "An RSA public key as defined in RFC 7518 Section 6.3.1"
})

/**
 * An RSA private key represented as a JWK. Extends the public key with
 * private key parameters. The "d" parameter is required; the CRT parameters
 * ("p", "q", "dp", "dq", "qi") should be included together — if any one of
 * them is present then all of them must be present, which the union encodes.
 *
 * @category RSA
 * @since 4.0.0
 */
export const RsaPrivateKey = Schema.Union([
  // The full CRT form must come first: a JWK carrying the CRT parameters also
  // structurally satisfies the d-only member, and Struct decoding drops
  // unlisted fields, so a d-only-first union would silently discard the CRT
  // parameters of a complete private key.
  Schema.Struct({
    ...RsaPublicKey.fields,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.1 */
    d: Schema.String,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.2 */
    p: Schema.String,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.3 */
    q: Schema.String,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.4 */
    dp: Schema.String,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.5 */
    dq: Schema.String,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.6 */
    qi: Schema.String,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.7 */
    oth: Schema.optional(Schema.Array(OtherPrimeInfo))
  }),
  Schema.Struct({
    ...RsaPublicKey.fields,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.1 */
    d: Schema.String,

    /** @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.2.7 */
    oth: Schema.optional(Schema.Array(OtherPrimeInfo))
  })
]).annotate({
  title: "RSA Private Key",
  expected: "a JWK with 'kty' of 'RSA' representing an RSA private key",
  description: "An RSA private key as defined in RFC 7518 Section 6.3.2"
})

/**
 * A symmetric key (octet sequence) represented as a JWK.
 *
 * Members "kty" and "k" are required for symmetric keys.
 *
 * @category Symmetric
 * @since 4.0.0
 */
export const OctKey = Schema.Struct({
  /** Key Type — MUST be "oct" */
  kty: Schema.Literal("oct"),

  /**
   * "k" (Key Value) Base64url-encoded key value.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.4.1
   */
  k: Schema.String,

  ...JwkCommonFields.fields
}).annotate({
  title: "Symmetric Key",
  expected: "a JWK with 'kty' of 'oct' representing a symmetric (octet sequence) key",
  description: "A symmetric (octet sequence) key as defined in RFC 7518 Section 6.4"
})

/**
 * A JSON Web Key (JWK) as defined in RFC 7517. This is a discriminated union
 * over the "kty" field, supporting EC, RSA, and symmetric (oct) key types.
 *
 * The union includes both public and private key representations — consumers
 * can narrow using the individual schemas (e.g. `EcPublicKey`,
 * `RsaPrivateKey`) when a specific key form is expected. Private forms come
 * first so that keys carrying private members decode as private keys.
 *
 * @category JWK
 * @since 4.0.0
 */
export const Jwk = Schema.Union([EcPrivateKey, EcPublicKey, RsaPrivateKey, RsaPublicKey, OctKey]).annotate({
  title: "JSON Web Key",
  expected: "a JSON object representing a cryptographic key, with the 'kty' parameter indicating the key type",
  description: "A JSON Web Key as defined in RFC 7517, discriminated by the 'kty' parameter"
})

/**
 * A JWK Set as defined in RFC 7517 Section 5. A JSON object that represents
 * a set of JWKs. The "keys" member is required and must be an array of JWKs.
 *
 * @category JWK Set
 * @since 4.0.0
 */
export const JwkSet = Schema.Struct({
  /** @see https://www.rfc-editor.org/rfc/rfc7517#section-5.1 */
  keys: Schema.Array(Jwk)
}).annotate({
  title: "JWK Set",
  expected: "a JSON object with a 'keys' member containing an array of JWKs",
  description: "A set of JSON Web Keys as defined in RFC 7517 Section 5"
})

/**
 * Returns whether a JWK may be used to verify a signature under the given JWS
 * algorithm: the key type (and EC curve) must match the algorithm family, and
 * a key explicitly marked for encryption (`use: "enc"`) is rejected. Gate key
 * selection with this so a token cannot steer a key of one family into an
 * incompatible algorithm — e.g. verifying an `RS256` token against an `oct`
 * HMAC key (the classic asymmetric/symmetric confusion), which WebCrypto's
 * import step alone does not prevent when the key set is attacker-influenced.
 *
 * @category Compatibility
 * @since 4.0.0
 */
export const isCompatibleWith = (
  alg: (typeof JwsAlgorithm)["Type"],
  jwk: (typeof Jwk)["Type"]
): boolean => {
  if (jwk.use === "enc") return false
  switch (alg) {
    case "ES256":
      return jwk.kty === "EC" && jwk.crv === "P-256"
    case "ES384":
      return jwk.kty === "EC" && jwk.crv === "P-384"
    case "ES512":
      return jwk.kty === "EC" && jwk.crv === "P-521"
    case "RS256":
    case "RS384":
    case "RS512":
    case "PS256":
    case "PS384":
    case "PS512":
      return jwk.kty === "RSA"
    case "HS256":
    case "HS384":
    case "HS512":
      return jwk.kty === "oct"
  }
}

/**
 * Returns whether a JWK is a symmetric (secret) key. Such keys must never be
 * accepted from an untrusted source (e.g. a token's `jku`/`jwk` header) as a
 * signature-verification key, as that enables signature forgery.
 *
 * @category Compatibility
 * @since 4.0.0
 */
export const isSymmetric = (jwk: (typeof Jwk)["Type"]): boolean => jwk.kty === "oct"

/**
 * Returns whether a JWK carries private key material (`d` for EC/RSA). A
 * public verification key never does; presence of private material in a key
 * pulled from an untrusted source indicates misuse and should be rejected.
 *
 * @category Compatibility
 * @since 4.0.0
 */
export const isPrivate = (jwk: (typeof Jwk)["Type"]): boolean => (jwk.kty === "EC" || jwk.kty === "RSA") && "d" in jwk
