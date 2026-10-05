/** @internal */
import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  ConstraintError,
  DeadlockError,
  LockTimeoutError,
  SqlError,
  SqlSyntaxError,
  StatementTimeoutError,
  UniqueViolation,
  UnknownError
} from "../../sql/SqlError.ts"
import { decoder, Reader } from "./protocol.ts"
const mysqlErrnoFromCause = (cause: unknown): number | undefined => {
  if (typeof cause !== "object" || cause === null || !("errno" in cause)) {
    return undefined
  }
  const errno = cause.errno
  return typeof errno === "number" ? errno : undefined
}

const mysqlConnectionErrorCodes = new Set([1040, 1042, 1043, 1129, 1130, 1203])
const mysqlAuthorizationErrorCodes = new Set([1044, 1142, 1143, 1227])
const mysqlSyntaxErrorCodes = new Set([1054, 1064, 1146])
const mysqlConstraintErrorCodes = new Set([1022, 1048, 1169, 1216, 1217, 1451, 1452, 1557])

const UNKNOWN_CONSTRAINT = "unknown"

const normalizeConstraintIdentifier = (identifier: unknown): string => {
  if (typeof identifier !== "string") {
    return UNKNOWN_CONSTRAINT
  }
  const trimmed = identifier.trim()
  return trimmed.length === 0 ? UNKNOWN_CONSTRAINT : trimmed
}

const mysqlCauseProperty = (cause: unknown, property: "constraint" | "message" | "sqlMessage"): unknown => {
  if (typeof cause !== "object" || cause === null || !(property in cause)) {
    return undefined
  }
  return (cause as Record<string, unknown>)[property]
}

const mysqlDuplicateEntryConstraintFromMessage = (message: unknown): string => {
  if (typeof message !== "string") {
    return UNKNOWN_CONSTRAINT
  }
  const match = /\bfor key\s+(?:'([^']*)'|\x60([^\x60]*)\x60|([^\s'\x60]+))/i.exec(message)
  return match === null ?
    UNKNOWN_CONSTRAINT :
    normalizeConstraintIdentifier(match[1] ?? match[2] ?? match[3])
}

const mysqlDuplicateEntryConstraintFromCause = (cause: unknown): string => {
  const constraint = normalizeConstraintIdentifier(mysqlCauseProperty(cause, "constraint"))
  if (constraint !== UNKNOWN_CONSTRAINT) {
    return constraint
  }
  const sqlMessageConstraint = mysqlDuplicateEntryConstraintFromMessage(mysqlCauseProperty(cause, "sqlMessage"))
  if (sqlMessageConstraint !== UNKNOWN_CONSTRAINT) {
    return sqlMessageConstraint
  }
  return mysqlDuplicateEntryConstraintFromMessage(mysqlCauseProperty(cause, "message"))
}

export const classifyError = (
  cause: unknown,
  message: string,
  operation: string
) => {
  const props = { cause, message, operation }
  const errno = mysqlErrnoFromCause(cause)
  if (errno !== undefined) {
    if (mysqlConnectionErrorCodes.has(errno)) {
      return new ConnectionError(props)
    }
    if (errno === 1045) {
      return new AuthenticationError(props)
    }
    if (mysqlAuthorizationErrorCodes.has(errno)) {
      return new AuthorizationError(props)
    }
    if (mysqlSyntaxErrorCodes.has(errno)) {
      return new SqlSyntaxError(props)
    }
    if (errno === 1062) {
      return new UniqueViolation({ ...props, constraint: mysqlDuplicateEntryConstraintFromCause(cause) })
    }
    if (mysqlConstraintErrorCodes.has(errno)) {
      return new ConstraintError(props)
    }
    if (errno === 1213) {
      return new DeadlockError(props)
    }
    if (errno === 1205) {
      return new LockTimeoutError(props)
    }
    if (errno === 3024) {
      return new StatementTimeoutError(props)
    }
  }
  return new UnknownError(props)
}

export const serverError = (packet: Uint8Array, operation = "query"): SqlError => {
  const reader = new Reader(packet)
  reader.u8()
  const errno = reader.u16()
  let sqlState: string | undefined
  if (reader.remaining > 0 && reader.bytes[reader.offset] === 35) {
    reader.u8()
    sqlState = decoder.decode(reader.take(5))
  }
  const message = decoder.decode(reader.take(reader.remaining))
  const cause = { errno, sqlState, message }
  return new SqlError({ reason: classifyError(cause, message, operation) })
}
