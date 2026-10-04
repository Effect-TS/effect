import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  ConstraintError,
  DeadlockError,
  LockTimeoutError,
  SerializationError,
  SqlError,
  type SqlErrorReason,
  SqlSyntaxError,
  StatementTimeoutError,
  UniqueViolation,
  UnknownError
} from "effect/unstable/sql/SqlError"
import type * as MysqlProtocol from "../MysqlProtocol.ts"

/** @internal */
export interface ErrorProps {
  readonly cause: unknown
  readonly message: string
  readonly operation: string
}

/**
 * Server error numbers, grouped by the reason they map to. A number here beats
 * the SQLSTATE class, because MySQL reuses a few broad states for errors that
 * differ in whether a retry can help.
 *
 * @internal
 */
const connectionErrnos = new Set([1040, 1042, 1043, 1129, 1130, 1152, 1153, 1158, 1159, 1160, 1161, 1203])
/** @internal */
const authorizationErrnos = new Set([1044, 1142, 1143, 1227])
/** @internal */
const syntaxErrnos = new Set([1054, 1064, 1146])
/** @internal */
const constraintErrnos = new Set([1022, 1048, 1169, 1216, 1217, 1451, 1452, 1557])

const UNKNOWN_CONSTRAINT = "unknown"

const normalizeConstraint = (identifier: string | undefined): string => {
  if (typeof identifier !== "string") return UNKNOWN_CONSTRAINT
  const trimmed = identifier.trim()
  return trimmed.length === 0 ? UNKNOWN_CONSTRAINT : trimmed
}

/**
 * Recovers the index name from a duplicate-entry message, which is the only
 * place the server reports it. The name may be quoted with `'` or a backtick,
 * or unquoted.
 *
 * @internal
 */
export const constraintFromMessage = (message: string | undefined): string => {
  if (typeof message !== "string") return UNKNOWN_CONSTRAINT
  const match = /\bfor key\s+(?:'([^']*)'|`([^`]*)`|([^\s'`]+))/i.exec(message)
  return match === null ? UNKNOWN_CONSTRAINT : normalizeConstraint(match[1] ?? match[2] ?? match[3])
}

/**
 * Maps a server error onto an Effect SQL reason.
 *
 * The error number is consulted first and the SQLSTATE class second, so an
 * error the table does not name still lands in the right family.
 *
 * @internal
 */
export const classifyErrno = (
  errno: number | undefined,
  sqlState: string | undefined,
  serverMessage: string | undefined,
  props: ErrorProps
): SqlErrorReason => {
  if (errno !== undefined) {
    if (connectionErrnos.has(errno)) return new ConnectionError(props)
    if (errno === 1045) return new AuthenticationError(props)
    if (authorizationErrnos.has(errno)) return new AuthorizationError(props)
    if (syntaxErrnos.has(errno)) return new SqlSyntaxError(props)
    if (errno === 1062) {
      return new UniqueViolation({ ...props, constraint: constraintFromMessage(serverMessage) })
    }
    if (constraintErrnos.has(errno)) return new ConstraintError(props)
    if (errno === 1213) return new DeadlockError(props)
    if (errno === 1205) return new LockTimeoutError(props)
    if (errno === 3024) return new StatementTimeoutError(props)
  }
  if (sqlState !== undefined) {
    if (sqlState === "40001") return new SerializationError(props)
    if (sqlState.startsWith("08")) return new ConnectionError(props)
    if (sqlState.startsWith("28")) return new AuthenticationError(props)
    if (sqlState.startsWith("42")) return new SqlSyntaxError(props)
    if (sqlState.startsWith("23")) return new ConstraintError(props)
  }
  return new UnknownError(props)
}

/** @internal */
export const queryError = (cause: unknown, message: string, operation: string): SqlError =>
  new SqlError({ reason: new UnknownError({ cause, message, operation }) })

/** @internal */
export const connectionError = (cause: unknown, message: string, operation: string): SqlError =>
  new SqlError({ reason: new ConnectionError({ cause, message, operation }) })

/**
 * Turns an ERR packet into the reason it stands for.
 *
 * @internal
 */
export const classifyErr = (err: MysqlProtocol.Err, message: string, operation: string): SqlErrorReason => {
  const cause = Object.assign(new Error(err.message), {
    errno: err.code,
    sqlState: err.sqlState,
    sqlMessage: err.message
  })
  return classifyErrno(err.code, err.sqlState, err.message, { cause, message, operation })
}
