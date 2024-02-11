/**
 * @since 1.0.0
 */
import type { ParseIssue } from "@effect/schema/ParseResult"
import * as Data from "effect/Data"
import * as Predicate from "effect/Predicate"

/**
 * @since 1.0.0
 */
export const SqlErrorTypeId = Symbol.for("@effect/sql/Error")

/**
 * @since 1.0.0
 */
export type SqlErrorTypeId = typeof SqlErrorTypeId

/**
 * @category constructor
 * @since 1.0.0
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
 * @category model
 * @since 1.0.0
 */
export class ResultLengthMismatch extends Data.TaggedError("ResultLengthMismatch")<{
  readonly expected: number
  readonly actual: number
}> {
  readonly [SqlErrorTypeId] = SqlErrorTypeId
}

/**
 * @category model
 * @since 1.0.0
 */
export class SchemaError extends Data.TaggedError("SchemaError")<{
  readonly type: "request" | "result"
  readonly error: ParseIssue
}> {
  readonly [SqlErrorTypeId] = SqlErrorTypeId
}
