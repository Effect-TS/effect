/**
 * JSON Web Algorithms (JWA) schemas based on RFC 7518.
 *
 * This module defines the cryptographic algorithm identifiers used for JWS
 * digital signatures and MACs (RFC 7518 Section 3), along with the WebCrypto
 * parameter sets needed to import keys and to sign/verify with each
 * algorithm. Those two parameter sets differ (e.g. ECDSA import needs
 * `namedCurve` while signing needs `hash`), so they are exposed separately.
 *
 * @since 4.0.0
 */
import * as Match from "../../Match.ts"
import * as Schema from "../../Schema.ts"

/**
 * JWS algorithm values as defined in RFC 7518 Section 3.1. These algorithms
 * are used for digital signatures and MACs to secure the JWS. The "none"
 * algorithm is intentionally unsupported.
 *
 * @category JWS
 * @since 4.0.0
 */
export const JwsAlgorithm = Schema.Literals([
  // HMAC with SHA-2 Functions
  "HS256", // HMAC using SHA-256 - Required
  "HS384", // HMAC using SHA-384 - Optional
  "HS512", // HMAC using SHA-512 - Optional

  // Digital Signature with RSASSA-PKCS1-v1_5
  "RS256", // RSASSA-PKCS1-v1_5 using SHA-256 - Recommended
  "RS384", // RSASSA-PKCS1-v1_5 using SHA-384 - Optional
  "RS512", // RSASSA-PKCS1-v1_5 using SHA-512 - Optional

  // Digital Signature with ECDSA
  "ES256", // ECDSA using P-256 and SHA-256 - Recommended+
  "ES384", // ECDSA using P-384 and SHA-384 - Optional
  "ES512", // ECDSA using P-521 and SHA-512 - Optional

  // Digital Signature with RSASSA-PSS
  "PS256", // RSASSA-PSS using SHA-256 and MGF1 with SHA-256 - Optional
  "PS384", // RSASSA-PSS using SHA-384 and MGF1 with SHA-384 - Optional
  "PS512" // RSASSA-PSS using SHA-512 and MGF1 with SHA-512 - Optional
]).annotate({
  title: "JWS Algorithm",
  expected: "a JWS algorithm identifier string",
  description: "Algorithm used for digital signatures and MACs in JWS as defined in RFC 7518 Section 3.1"
})

/**
 * WebCrypto parameters for `crypto.subtle.importKey` for each JWS algorithm.
 *
 * @category WebCrypto
 * @since 4.0.0
 */
export const importParameters = Match.type<(typeof JwsAlgorithm)["Type"]>().pipe(
  Match.when("HS256", () => ({ name: "HMAC", hash: "SHA-256" }) as HmacImportParams),
  Match.when("HS384", () => ({ name: "HMAC", hash: "SHA-384" }) as HmacImportParams),
  Match.when("HS512", () => ({ name: "HMAC", hash: "SHA-512" }) as HmacImportParams),
  Match.when("RS256", () => ({ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }) as RsaHashedImportParams),
  Match.when("RS384", () => ({ name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" }) as RsaHashedImportParams),
  Match.when("RS512", () => ({ name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" }) as RsaHashedImportParams),
  Match.when("ES256", () => ({ name: "ECDSA", namedCurve: "P-256" }) as EcKeyImportParams),
  Match.when("ES384", () => ({ name: "ECDSA", namedCurve: "P-384" }) as EcKeyImportParams),
  Match.when("ES512", () => ({ name: "ECDSA", namedCurve: "P-521" }) as EcKeyImportParams),
  Match.when("PS256", () => ({ name: "RSA-PSS", hash: "SHA-256" }) as RsaHashedImportParams),
  Match.when("PS384", () => ({ name: "RSA-PSS", hash: "SHA-384" }) as RsaHashedImportParams),
  Match.when("PS512", () => ({ name: "RSA-PSS", hash: "SHA-512" }) as RsaHashedImportParams),
  Match.exhaustive
)

/**
 * WebCrypto parameters for `crypto.subtle.sign`/`crypto.subtle.verify` for
 * each JWS algorithm.
 *
 * @category WebCrypto
 * @since 4.0.0
 */
export const signatureParameters = Match.type<(typeof JwsAlgorithm)["Type"]>().pipe(
  Match.whenOr("HS256", "HS384", "HS512", () => ({ name: "HMAC" }) as AlgorithmIdentifier),
  Match.whenOr("RS256", "RS384", "RS512", () => ({ name: "RSASSA-PKCS1-v1_5" }) as AlgorithmIdentifier),
  Match.when("ES256", () => ({ name: "ECDSA", hash: "SHA-256" }) as EcdsaParams),
  Match.when("ES384", () => ({ name: "ECDSA", hash: "SHA-384" }) as EcdsaParams),
  Match.when("ES512", () => ({ name: "ECDSA", hash: "SHA-512" }) as EcdsaParams),
  Match.when("PS256", () => ({ name: "RSA-PSS", saltLength: 32 }) as RsaPssParams),
  Match.when("PS384", () => ({ name: "RSA-PSS", saltLength: 48 }) as RsaPssParams),
  Match.when("PS512", () => ({ name: "RSA-PSS", saltLength: 64 }) as RsaPssParams),
  Match.exhaustive
)

/**
 * JWE "alg" (key management) algorithm values as defined in RFC 7518 Section
 * 4.1. These determine how the Content Encryption Key (CEK) is encrypted or
 * derived. `RSA1_5` is intentionally omitted: the Web Crypto API does not
 * implement RSAES-PKCS1-v1_5 encryption, and RFC 8725 discourages its use.
 *
 * @category JWE
 * @since 4.0.0
 */
export const JweAlgorithm = Schema.Literals([
  // Key Encryption with RSAES OAEP
  "RSA-OAEP", // RSAES OAEP using default (SHA-1) parameters - Recommended-
  "RSA-OAEP-256", // RSAES OAEP using SHA-256 and MGF1 with SHA-256 - Optional

  // Key Wrapping with AES Key Wrap
  "A128KW", // AES Key Wrap using 128-bit key - Recommended
  "A192KW", // AES Key Wrap using 192-bit key - Optional
  "A256KW", // AES Key Wrap using 256-bit key - Recommended

  // Direct Encryption with a Shared Symmetric Key
  "dir", // Direct use of a shared symmetric key - Recommended

  // Key Agreement with ECDH-ES
  "ECDH-ES", // ECDH-ES using Concat KDF, direct - Recommended+
  "ECDH-ES+A128KW", // ECDH-ES using Concat KDF and CEK wrapped with A128KW - Recommended
  "ECDH-ES+A192KW", // ECDH-ES using Concat KDF and CEK wrapped with A192KW - Optional
  "ECDH-ES+A256KW", // ECDH-ES using Concat KDF and CEK wrapped with A256KW - Recommended

  // Key Encryption with AES GCM
  "A128GCMKW", // Key wrapping with AES GCM using 128-bit key - Optional
  "A192GCMKW", // Key wrapping with AES GCM using 192-bit key - Optional
  "A256GCMKW", // Key wrapping with AES GCM using 256-bit key - Optional

  // Key Encryption with PBES2
  "PBES2-HS256+A128KW", // PBES2 with HMAC SHA-256 and A128KW wrapping - Optional
  "PBES2-HS384+A192KW", // PBES2 with HMAC SHA-384 and A192KW wrapping - Optional
  "PBES2-HS512+A256KW" // PBES2 with HMAC SHA-512 and A256KW wrapping - Optional
]).annotate({
  title: "JWE Key Management Algorithm",
  expected: "a JWE key management algorithm identifier string",
  description: "Algorithm used to encrypt or determine the CEK as defined in RFC 7518 Section 4.1"
})

/**
 * JWE "enc" (content encryption) algorithm values as defined in RFC 7518
 * Section 5.1. These perform authenticated encryption on the plaintext.
 *
 * @category JWE
 * @since 4.0.0
 */
export const JweEncryption = Schema.Literals([
  // Authenticated Encryption with AES_CBC_HMAC_SHA2
  "A128CBC-HS256", // AES 128 CBC + HMAC SHA-256 (32-byte CEK) - Required
  "A192CBC-HS384", // AES 192 CBC + HMAC SHA-384 (48-byte CEK) - Optional
  "A256CBC-HS512", // AES 256 CBC + HMAC SHA-512 (64-byte CEK) - Required

  // Authenticated Encryption with AES GCM
  "A128GCM", // AES GCM using 128-bit key - Recommended
  "A192GCM", // AES GCM using 192-bit key - Optional
  "A256GCM" // AES GCM using 256-bit key - Recommended
]).annotate({
  title: "JWE Content Encryption Algorithm",
  expected: "a JWE content encryption algorithm identifier string",
  description: "Authenticated encryption algorithm as defined in RFC 7518 Section 5.1"
})

/**
 * Structural parameters for a JWE content encryption algorithm: the Content
 * Encryption Key size, IV size, and — for the composite AES-CBC-HMAC family —
 * the split key sizes, authentication tag size, and HMAC hash.
 *
 * @category JWE
 * @since 4.0.0
 */
export const encryptionParameters = Match.type<(typeof JweEncryption)["Type"]>().pipe(
  Match.when("A128GCM", () => ({ kind: "gcm", cekBytes: 16, ivBytes: 12 }) as const),
  Match.when("A192GCM", () => ({ kind: "gcm", cekBytes: 24, ivBytes: 12 }) as const),
  Match.when("A256GCM", () => ({ kind: "gcm", cekBytes: 32, ivBytes: 12 }) as const),
  Match.when(
    "A128CBC-HS256",
    () =>
      ({ kind: "cbc", cekBytes: 32, ivBytes: 16, macBytes: 16, encBytes: 16, tagBytes: 16, hash: "SHA-256" }) as const
  ),
  Match.when(
    "A192CBC-HS384",
    () =>
      ({ kind: "cbc", cekBytes: 48, ivBytes: 16, macBytes: 24, encBytes: 24, tagBytes: 24, hash: "SHA-384" }) as const
  ),
  Match.when(
    "A256CBC-HS512",
    () =>
      ({ kind: "cbc", cekBytes: 64, ivBytes: 16, macBytes: 32, encBytes: 32, tagBytes: 32, hash: "SHA-512" }) as const
  ),
  Match.exhaustive
)
