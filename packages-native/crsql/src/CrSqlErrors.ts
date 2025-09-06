/**
 * Error types for CR-SQLite operations.
 *
 * This module defines tagged errors used throughout the CR-SQLite package
 * for handling various failure scenarios in a type-safe manner.
 *
 * @since 0.1.0
 * @example
 * ```typescript
 * import * as CrSqlErrors from "@effect-native/crsql/CrSqlErrors"
 * import { Effect } from "effect"
 *
 * // Handle specific error types
 * const program = Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing()).pipe(
 *   Effect.catchTag("CrSqliteExtensionMissing", (error) =>
 *     Effect.succeed("handled error")
 *   )
 * )
 * ```
 */
import * as Schema from "effect/Schema"

/**
 * Error indicating that the `unhex()` function is not available in SQLite.
 *
 * This error occurs when attempting to use hex decoding functionality
 * that requires the `unhex()` function, but it's not available in the
 * current SQLite installation or version.
 *
 * @since 0.1.0
 * @category Errors
 */
export class UnhexUnavailable extends Schema.TaggedError<UnhexUnavailable>(
  "@effect-native/crsql/UnhexUnavailable"
)("UnhexUnavailable", {
  cause: Schema.optional(Schema.Defect)
}) {}

/**
 * Error indicating that the CR-SQLite extension is not loaded or available.
 *
 * This error occurs when attempting to use CR-SQLite functionality but
 * the extension has not been properly loaded into the SQLite connection.
 * This typically happens when the extension file is missing or when
 * `LOAD EXTENSION` has not been called.
 *
 * @since 0.1.0
 * @category Errors
 */
export class CrSqliteExtensionMissing extends Schema.TaggedError<CrSqliteExtensionMissing>(
  "@effect-native/crsql/CrSqliteExtensionMissing"
)("CrSqliteExtensionMissing", {
  cause: Schema.optional(Schema.Defect)
}) {}
