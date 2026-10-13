/**
 * The Web Crypto API that the cryptographic layers run on.
 *
 * The layers of the `effect/crypto` modules, such as `Aes.layer`, run on the
 * {@link SubtleCrypto} reference, which defaults to `globalThis.crypto.subtle`.
 * The module also defines {@link HashAlgorithm}, the hash identifiers the
 * services take as parameters.
 *
 * The services do not copy their byte inputs: do not modify keys, nonces, or
 * data until the operation that reads them completes. Results are fresh arrays
 * that the caller owns.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Predicate from "../Predicate.ts"
import * as CryptoError from "./CryptoError.ts"

/**
 * Reference to the `SubtleCrypto` that the Web Crypto layers run on.
 *
 * **When to use**
 *
 * Use to run the Web Crypto layers on a specific `SubtleCrypto`, such as a
 * polyfill or a test double, by providing it with `Layer.succeed`.
 *
 * **Details**
 *
 * The default is `globalThis.crypto.subtle`, which is `undefined` where the
 * runtime has no Web Crypto.
 *
 * @see {@link subtleCrypto} for reading the reference in a layer
 *
 * @stability unstable
 * @category references
 * @since 4.0.0
 */
export const SubtleCrypto: Context.Reference<globalThis.SubtleCrypto | undefined> = Context.Reference<
  globalThis.SubtleCrypto | undefined
>("effect/crypto/SubtleCrypto", { defaultValue: () => globalThis.crypto?.subtle })

/**
 * Reads the {@link SubtleCrypto} reference, failing when there is none.
 *
 * **Details**
 *
 * Fails with a `CryptoError` whose reason is `Unsupported` where the runtime
 * has no Web Crypto. The Web Crypto layers read it when they are built, so they
 * fail to build there.
 *
 * **Gotchas**
 *
 * Browsers expose `crypto.subtle` only in secure contexts.
 *
 * @stability unstable
 * @category accessors
 * @since 4.0.0
 */
export const subtleCrypto: Effect.Effect<globalThis.SubtleCrypto, CryptoError.CryptoError> = SubtleCrypto.use((
  subtle
) =>
  subtle === undefined
    ? Effect.fail(
      new CryptoError.CryptoError({
        algorithm: "WebCrypto",
        method: "subtle",
        reason: new CryptoError.Unsupported({
          description: "Web Crypto is unavailable; browsers expose crypto.subtle only in secure contexts"
        })
      })
    )
    : Effect.succeed(subtle)
)

/**
 * Returns `true` for the `OperationError` that Web Crypto raises when an
 * operation fails on valid arguments, such as a decryption whose tag does not
 * match.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isOperationError = (cause: unknown): boolean =>
  Predicate.hasProperty(cause, "name") && cause.name === "OperationError"

/**
 * Creates the `CryptoError` for an exception thrown by Web Crypto.
 *
 * **Details**
 *
 * The reason follows the exception: `DataError` is `InvalidKey`,
 * `NotSupportedError` is `Unsupported`, `InvalidAccessError`, `SyntaxError`,
 * and `TypeError` are `BadArgument`, and anything else, including
 * `OperationError`, is `Unknown`. Handle `OperationError` first where it has a specific meaning,
 * such as `AuthenticationFailed` for decryption.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const webCryptoError = (algorithm: string, method: string, cause: unknown): CryptoError.CryptoError =>
  new CryptoError.CryptoError({ algorithm, method, reason: reasonFor(method, cause) })

const reasonFor = (method: string, cause: unknown): CryptoError.CryptoErrorReason => {
  switch (Predicate.hasProperty(cause, "name") ? cause.name : undefined) {
    case "DataError":
      return new CryptoError.InvalidKey({ description: "Invalid key data", cause })
    case "NotSupportedError":
      return new CryptoError.Unsupported({ description: `${method} does not support the requested parameters`, cause })
    case "InvalidAccessError":
    case "SyntaxError":
      return new CryptoError.BadArgument({
        description: `${method} does not permit the requested key or usages`,
        cause
      })
    case "TypeError":
      return new CryptoError.BadArgument({ description: `${method} does not accept the requested parameters`, cause })
    default:
      return new CryptoError.Unknown({ description: `Could not perform ${method}`, cause })
  }
}

/**
 * SHA hash algorithms used as parameters by HMAC, key derivation, RSA, and
 * ECDSA.
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
