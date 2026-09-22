/**
 * Shared error type for encoding and decoding operations.
 *
 * @since 4.0.0
 */
import * as Data from "../Data.ts"
import { hasProperty } from "../Predicate.ts"

/**
 * Type identifier stored on `EncodingError` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const EncodingErrorTypeId = "~effect/encoding/EncodingError" as const

/**
 * Literal type of the `EncodingErrorTypeId` marker.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type EncodingErrorTypeId = typeof EncodingErrorTypeId

/**
 * Error returned when an encoding or decoding operation cannot process its input.
 *
 * @category errors
 * @since 4.0.0
 */
export class EncodingError extends Data.TaggedError("EncodingError")<{
  kind: "Decode" | "Encode"
  module: string
  input: unknown
  message: string
}> {
  /**
   * The runtime type identifier.
   *
   * @since 4.0.0
   */
  readonly [EncodingErrorTypeId]: EncodingErrorTypeId = EncodingErrorTypeId
}

/**
 * Checks whether a value is an `EncodingError`.
 *
 * @category guards
 * @since 4.0.0
 */
export const isEncodingError = (u: unknown): u is EncodingError => hasProperty(u, EncodingErrorTypeId)
