/**
 * @since 4.0.0
 */
import * as Data from "./Data.ts"
import * as Predicate from "./Predicate.ts"
import * as SchemaIssue from "./SchemaIssue.ts"

const TypeId = "~effect/SchemaError/SchemaError"

/**
 * Error thrown (or returned as the error channel value) when schema decoding
 * or encoding fails.
 *
 * **Details**
 *
 * The `issue` field contains a structured {@link SchemaIssue.Issue} tree describing
 * every validation failure, including the path to the problematic value and
 * the expected type or constraint. The `message` field renders the issue tree
 * with the default formatter. When input reporting is enabled, the message may
 * include reported input. Other Issue fields and custom annotations or messages
 * are not sanitized.
 *
 * Use {@link isSchemaError} to narrow an unknown value to `SchemaError`.
 *
 * **Example** (Catching a SchemaError)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 *
 * try {
 *   Schema.decodeUnknownSync(Schema.Number)("not a number")
 * } catch (err) {
 *   if (Schema.isSchemaError(err)) {
 *     err.message // => "Expected number"
 *   }
 * }
 * ```
 *
 * @category errors
 * @since 4.0.0
 */
export class SchemaError extends Data.TaggedError("SchemaError")<{
  readonly issue: SchemaIssue.Issue
}> {
  readonly [TypeId]: typeof TypeId = TypeId
  constructor(issue: SchemaIssue.Issue) {
    super({ issue })
  }
  override get message() {
    return SchemaIssue.defaultFormatter(this.issue)
  }
  override toString() {
    return `SchemaError(${this.message})`
  }
}

/**
 * Returns `true` if `u` is a {@link SchemaError}.
 *
 * @category guards
 * @since 4.0.0
 */
export function isSchemaError(u: unknown): u is SchemaError {
  return Predicate.hasProperty(u, TypeId) && u[TypeId] === TypeId
}
