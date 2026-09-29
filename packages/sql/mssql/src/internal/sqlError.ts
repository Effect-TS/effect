import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  ConstraintError,
  DeadlockError,
  LockTimeoutError,
  SerializationError,
  type SqlErrorReason,
  SqlSyntaxError,
  UniqueViolation,
  UnknownError
} from "effect/sql/SqlError"

interface ErrorProps {
  readonly cause: unknown
  readonly message: string
  readonly operation: string
}

const connectionErrors = new Set([233, 10054])
const authenticationErrors = new Set([4060, 18452, 18456])
const authorizationErrors = new Set([229, 230, 262, 297, 300])
const syntaxErrors = new Set([102, 207, 208, 2714])
const constraintErrors = new Set([515, 547])

/** Duplicate key in a unique index, and in a UNIQUE or PRIMARY KEY constraint. */
const duplicateIndex = 2601
const duplicateConstraint = 2627

/**
 * Login errors that Azure SQL and failover partners report while a database
 * is starting, moving, or throttled, and that succeed when retried.
 *
 * @internal
 */
export const transientLoginErrors: ReadonlySet<number> = new Set([4060, 10928, 10929, 40197, 40501, 40613])

const property = (cause: unknown, name: string): unknown =>
  typeof cause === "object" && cause !== null && name in cause ? (cause as Record<string, unknown>)[name] : undefined

/** @internal */
export const errorNumber = (cause: unknown): number | undefined => {
  const number = property(cause, "number")
  return typeof number === "number" ? number : undefined
}

const normalizeConstraint = (constraint: unknown): string => {
  if (typeof constraint !== "string") return "unknown"
  const normalized = constraint.trim()
  return normalized.length === 0 ? "unknown" : normalized
}

/** SQL Server names the index or constraint only in the message text. */
const uniqueConstraint = (number: number, cause: unknown): string => {
  const constraint = normalizeConstraint(property(cause, "constraint"))
  if (constraint !== "unknown") return constraint
  const message = property(cause, "message")
  if (typeof message !== "string") return "unknown"
  const match = number === duplicateConstraint
    ? /\bconstraint\s+'([^']*)'/i.exec(message)
    : /\bunique index\s+'([^']*)'/i.exec(message)
  return match === null ? "unknown" : normalizeConstraint(match[1])
}

/**
 * Maps a SQL Server error number, read from `props.cause`, to a `SqlError`
 * reason. Errors without a known number fall back to `ConnectionError` or
 * `UnknownError`.
 *
 * @internal
 */
export const classifyError = (
  props: ErrorProps,
  fallback: "connection" | "unknown" = "unknown"
): SqlErrorReason => {
  const number = errorNumber(props.cause)
  if (number !== undefined) {
    if (connectionErrors.has(number)) {
      return new ConnectionError(props)
    }
    if (authenticationErrors.has(number)) {
      return new AuthenticationError(props)
    }
    if (authorizationErrors.has(number)) {
      return new AuthorizationError(props)
    }
    if (syntaxErrors.has(number)) {
      return new SqlSyntaxError(props)
    }
    if (number === duplicateIndex || number === duplicateConstraint) {
      return new UniqueViolation({ ...props, constraint: uniqueConstraint(number, props.cause) })
    }
    if (constraintErrors.has(number)) {
      return new ConstraintError(props)
    }
    if (number === 1205) {
      return new DeadlockError(props)
    }
    if (number === 3960) {
      return new SerializationError(props)
    }
    if (number === 1222) {
      return new LockTimeoutError(props)
    }
  }
  return fallback === "connection" ? new ConnectionError(props) : new UnknownError(props)
}
