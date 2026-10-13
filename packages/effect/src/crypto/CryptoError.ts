/**
 * The `CryptoError` returned by the cryptographic services, and the reasons it
 * carries, such as `InvalidKey` or `AuthenticationFailed`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Data from "../Data.ts"
import * as Predicate from "../Predicate.ts"

const CryptoErrorTypeId = "~effect/crypto/CryptoError" as const

/**
 * Reason for an argument that the operation rejects before using the key or
 * data, such as a wrong nonce length or an out-of-range iteration count.
 *
 * **Details**
 *
 * Also used for parameters that Web Crypto rejects, such as an AES-CTR counter
 * of the wrong length. Key material that the backend rejects is `InvalidKey`
 * instead.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class BadArgument extends Data.TaggedError("BadArgument")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Reason for key material that the backend rejects, such as malformed DER or
 * JWK data, a wrong key length, or a peer public key that produces an invalid
 * shared secret.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class InvalidKey extends Data.TaggedError("InvalidKey")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Reason for ciphertext that fails authentication or integrity checks during
 * decryption.
 *
 * **Details**
 *
 * No plaintext is returned. The reason does not reveal whether the key,
 * nonce, additional data, label, or ciphertext was wrong.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class AuthenticationFailed extends Data.TaggedError("AuthenticationFailed")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Reason for an algorithm or parameter that the host runtime does not
 * implement, such as a curve missing from an older Web Crypto implementation.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class Unsupported extends Data.TaggedError("Unsupported")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Reason for an unexpected failure reported by the cryptographic backend.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class Unknown extends Data.TaggedError("Unknown")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Union of the reasons carried by `CryptoError`.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export type CryptoErrorReason = BadArgument | InvalidKey | AuthenticationFailed | Unsupported | Unknown

/**
 * Error returned by cryptographic services.
 *
 * **When to use**
 *
 * Use to handle failures from any `effect/crypto` service, matching on
 * `reason` to separate caller mistakes from authentication failures.
 *
 * **Details**
 *
 * `algorithm` names the algorithm, such as `"AES-GCM"`, and `method` names
 * the operation, such as `"decrypt"`.
 *
 * **Example** (Recovering from failed authentication)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { CryptoError } from "effect/crypto"
 *
 * const decrypt = Effect.fail(
 *   new CryptoError.CryptoError({
 *     algorithm: "AES-GCM",
 *     method: "decrypt",
 *     reason: new CryptoError.AuthenticationFailed({ description: "Could not authenticate data" })
 *   })
 * )
 *
 * const program = decrypt.pipe(
 *   Effect.catchReason("CryptoError", "AuthenticationFailed", () => Effect.succeed("rejected"))
 * )
 *
 * await Effect.runPromise(program) // => "rejected"
 * ```
 *
 * @see {@link isCryptoError} for narrowing unknown values
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class CryptoError extends Data.TaggedError("CryptoError")<{
  readonly algorithm: string
  readonly method: string
  readonly reason: CryptoErrorReason
}> {
  /**
   * Marks this value as a cryptographic error for runtime guards.
   *
   * @since 4.0.0
   */
  readonly [CryptoErrorTypeId]: typeof CryptoErrorTypeId = CryptoErrorTypeId

  /**
   * Exposes the reason as the error cause.
   *
   * @since 4.0.0
   */
  override readonly cause: CryptoErrorReason = this.reason

  override get message(): string {
    return `${this.algorithm}.${this.method}: ${this.reason._tag}: ${this.reason.message}`
  }
}

/**
 * Checks whether a value is a `CryptoError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isCryptoError = (u: unknown): u is CryptoError => Predicate.hasProperty(u, CryptoErrorTypeId)
