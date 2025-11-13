/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"

/**
 * @since 1.0.0
 */
export const SqlErrorTypeId: unique symbol = Symbol.for("@effect/sql/SqlError")

/**
 * @since 1.0.0
 */
export type SqlErrorTypeId = typeof SqlErrorTypeId

/**
 * @since 1.0.0
 */
export class SqlError extends TypeIdError(SqlErrorTypeId, "SqlError")<{
  cause?: unknown
  message?: string
}> {}

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
