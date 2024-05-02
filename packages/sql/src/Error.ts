/**
 * @since 1.0.0
 */
import { RefailError, TypeIdError } from "@effect/platform/Error"
import * as Predicate from "effect/Predicate"

/**
 * @since 1.0.0
 */
export const SqlErrorTypeId: unique symbol = Symbol.for("@effect/sql/Error")

/**
 * @since 1.0.0
 */
export type SqlErrorTypeId = typeof SqlErrorTypeId

/**
 * @since 1.0.0
 */
export class SqlError extends RefailError(SqlErrorTypeId, "SqlError")<{}> {
  get code() {
    if (Predicate.hasProperty(this.error, "code")) {
      return this.error.code
    }
    return undefined
  }

  get message() {
    const code = this.code
    return code ? `${code}: ${super.message}` : super.message
  }
}

/**
 * @since 1.0.0
 */
export class ResultLengthMismatch extends TypeIdError(SqlErrorTypeId, "ResultLengthMismatch")<{
  readonly expected: number
  readonly actual: number
}> {
  get message() {
    return `Expected ${this.expected} results but got ${this.actual}`
  }
}
