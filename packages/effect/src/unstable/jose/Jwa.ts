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
