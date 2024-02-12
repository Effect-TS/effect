/**
 * @since 1.0.0
 */
import type { ParseIssue } from "@effect/schema/ParseResult"
import * as Data from "effect/Data"
import * as Predicate from "effect/Predicate"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SqlErrorTypeId: unique symbol = Symbol.for("@effect/sql/Error")

/**
 * @since 1.0.0
 * @category symbols
 */
export type SqlErrorTypeId = typeof SqlErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class SqlError extends Data.TaggedError("SqlError")<{
  readonly message: string
  readonly code?: string
  readonly error: unknown
}> {
  readonly [SqlErrorTypeId] = SqlErrorTypeId
  constructor(params: {
    readonly message: string
    readonly code?: string
    readonly error: unknown
  }) {
    const props = { message: params.message, error: params.error }
    if (
      typeof params.error === "object" &&
      Predicate.isNotNullable(params.error) &&
      "code" in params.error &&
      typeof params.error.code === "string"
    ) {
      super(Object.assign(props, { code: params.error.code }))
    } else {
      super(props)
    }
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class ResultLengthMismatch extends Data.TaggedError("ResultLengthMismatch")<{
  readonly expected: number
  readonly actual: number
}> {
  readonly [SqlErrorTypeId] = SqlErrorTypeId
}

/**
 * @since 1.0.0
 * @category errors
 */
export class SchemaError extends Data.TaggedError("SchemaError")<{
  readonly type: "request" | "result"
  readonly error: ParseIssue
}> {
  readonly [SqlErrorTypeId] = SqlErrorTypeId
}
