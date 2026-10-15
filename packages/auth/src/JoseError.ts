/**
 * Typed JOSE failures with fixed diagnostics that never contain tokens, claims, keys, URLs, or native causes.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Schema from "effect/Schema"

/**
 * Error indicating invalid input to a cryptographic operation without retaining key material or plaintext.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class InvalidInput extends Schema.TaggedError<InvalidInput>()("JoseInvalidInput", {
  reason: Schema.Literals(["key", "nonce", "parameters", "data"])
}) {}

/**
 * Error indicating that the cryptographic backend does not support the requested algorithm.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class UnsupportedAlgorithm extends Schema.TaggedError<UnsupportedAlgorithm>()(
  "JoseUnsupportedAlgorithm",
  {}
) {}

/**
 * Error indicating a cryptographic backend failure without exposing its native cause.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class CryptoUnavailable extends Schema.TaggedError<CryptoUnavailable>()(
  "JoseCryptoUnavailable",
  {}
) {}

/**
 * Failures produced by cryptographic operations, with diagnostics that omit secret inputs and native causes.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export type OperationError = InvalidInput | UnsupportedAlgorithm | CryptoUnavailable

/**
 * Error indicating malformed compact serialization, headers, payload, or options; diagnostics omit sensitive inputs.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class InvalidToken extends Schema.TaggedError<InvalidToken>()("JoseInvalidToken", {
  reason: Schema.Literals(["serialization", "header", "payload", "parameters"])
}) {}

/**
 * Error indicating that the protected algorithm is outside the verification allowlist.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class AlgorithmNotAllowed extends Schema.TaggedError<AlgorithmNotAllowed>()(
  "JoseAlgorithmNotAllowed",
  {}
) {}

/**
 * Error indicating invalid key material or a key incompatible with the selected operation.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class InvalidKey extends Schema.TaggedError<InvalidKey>()("JoseInvalidKey", {}) {}

/**
 * Error indicating that a compact JWS signature could not be authenticated.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class SignatureVerificationFailed extends Schema.TaggedError<SignatureVerificationFailed>()(
  "JoseSignatureVerificationFailed",
  {}
) {}

/**
 * Error indicating that authenticated decryption failed.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class DecryptionFailed extends Schema.TaggedError<DecryptionFailed>()(
  "JoseDecryptionFailed",
  {}
) {}

/**
 * Error indicating that no public key matches the requested algorithm and key identifier.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class KeyNotFound extends Schema.TaggedError<KeyNotFound>()("JoseKeyNotFound", {}) {}

/**
 * Error indicating that more than one public key matches the selection policy.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class AmbiguousKey extends Schema.TaggedError<AmbiguousKey>()("JoseAmbiguousKey", {}) {}

/**
 * Error indicating a remote key-set configuration, transport, response, or lifecycle failure.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class JwksUnavailable extends Schema.TaggedError<JwksUnavailable>()("JoseJwksUnavailable", {
  reason: Schema.Literals(["configuration", "transport", "response", "cooldown", "busy", "closed"])
}) {}

/**
 * Error indicating a missing, invalid, mismatched, or temporally invalid registered claim.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class ClaimValidationFailed extends Schema.TaggedError<ClaimValidationFailed>()(
  "JoseClaimValidationFailed",
  {
    claim: Schema.Literals(["registered", "iss", "sub", "aud", "exp", "nbf", "iat", "jti", "typ"]),
    reason: Schema.Literals([
      "invalid",
      "missing",
      "mismatch",
      "expired",
      "notYetValid",
      "tooOld",
      "future"
    ])
  }
) {}

/**
 * Failures produced when importing or resolving key material.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export type KeyError = InvalidKey | KeyNotFound | AmbiguousKey | JwksUnavailable | OperationError

/**
 * Failures produced when authenticating a compact JWS or resolving its verification key.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export type VerifyError =
  | KeyError
  | InvalidToken
  | AlgorithmNotAllowed
  | SignatureVerificationFailed
