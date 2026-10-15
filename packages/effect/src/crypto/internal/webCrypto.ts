import * as Effect from "../../Effect.ts"
import * as Predicate from "../../Predicate.ts"
import * as CryptoError from "../CryptoError.ts"
import { WebCrypto } from "../WebCrypto.ts"

/** @internal */
export const subtleUnavailable = (): Error =>
  new Error("crypto.subtle is unavailable; browsers expose it only in secure contexts")

/**
 * Reads `crypto.subtle` from the `WebCrypto` reference, dying when it is
 * missing, as in an insecure browser context.
 *
 * @internal
 */
export const subtle: Effect.Effect<SubtleCrypto> = WebCrypto.use((crypto) => {
  const subtle = crypto?.subtle
  return subtle === undefined ? Effect.die(subtleUnavailable()) : Effect.succeed(subtle)
})

/** @internal */
export const isOperationError = (cause: unknown): boolean =>
  Predicate.hasProperty(cause, "name") && cause.name === "OperationError"

/**
 * Maps an exception thrown by `crypto.subtle` to a `CryptoError`.
 *
 * `DataError` and `InvalidAccessError` are `InvalidKey`, and
 * `NotSupportedError` is `Unsupported`. An `OperationError` becomes the reason
 * from `onOperationError`, such as `DecryptionFailed` for a decryption. Any
 * other exception is rethrown, which `Effect.tryPromise` turns into a defect.
 *
 * @internal
 */
export const webCryptoError = (
  module: string,
  method: string,
  cause: unknown,
  onOperationError?: () => CryptoError.CryptoErrorReason
): CryptoError.CryptoError => {
  const reason = reasonFor(method, cause, onOperationError)
  if (reason === undefined) throw cause
  return new CryptoError.CryptoError({ module, method, reason })
}

const reasonFor = (
  method: string,
  cause: unknown,
  onOperationError: (() => CryptoError.CryptoErrorReason) | undefined
): CryptoError.CryptoErrorReason | undefined => {
  switch (Predicate.hasProperty(cause, "name") ? cause.name : undefined) {
    case "DataError":
      return new CryptoError.InvalidKey({ description: "Invalid key data", cause })
    case "InvalidAccessError":
      return new CryptoError.InvalidKey({ description: `The key cannot be used for ${method}`, cause })
    case "NotSupportedError":
      return new CryptoError.Unsupported({ description: `${method} does not support the requested parameters`, cause })
    case "OperationError":
      return onOperationError?.()
    default:
      return undefined
  }
}
