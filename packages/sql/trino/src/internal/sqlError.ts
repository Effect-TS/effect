import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  ConstraintError,
  SerializationError,
  SqlError,
  type SqlErrorReason,
  SqlSyntaxError,
  StatementTimeoutError,
  UnknownError
} from "effect/sql/SqlError"
import type { QueryError, TrinoFailure } from "./failure.ts"
import { isNotReady } from "./protocol.ts"

const syntaxErrorNames: ReadonlySet<string> = new Set([
  "SYNTAX_ERROR",
  "AMBIGUOUS_NAME",
  "AMBIGUOUS_RETURN_TYPE",
  "TYPE_MISMATCH",
  "TYPE_NOT_FOUND",
  "FUNCTION_NOT_FOUND",
  "COLUMN_NOT_FOUND",
  "TABLE_NOT_FOUND",
  "SCHEMA_NOT_FOUND",
  "CATALOG_NOT_FOUND",
  "MISSING_CATALOG_NAME",
  "MISSING_SCHEMA_NAME",
  "MISSING_COLUMN_NAME",
  "MISSING_COLUMN_ALIASES",
  "MISSING_GROUP_BY",
  "MISSING_ORDER_BY",
  "DUPLICATE_COLUMN_NAME",
  "DUPLICATE_NAMED_QUERY",
  "INVALID_COLUMN_REFERENCE",
  "INVALID_LITERAL",
  "INVALID_PARAMETER_USAGE",
  "EXPRESSION_NOT_AGGREGATE",
  "EXPRESSION_NOT_CONSTANT",
  "EXPRESSION_NOT_SCALAR",
  "NESTED_AGGREGATION",
  "NESTED_WINDOW",
  "MISMATCHED_COLUMN_ALIASES",
  "STATEMENT_NOT_FOUND"
])

const timeoutErrorNames: ReadonlySet<string> = new Set([
  "EXCEEDED_TIME_LIMIT",
  "EXCEEDED_CPU_LIMIT",
  "EXCEEDED_SCAN_LIMIT",
  "ABANDONED_QUERY"
])

const connectionErrorNames: ReadonlySet<string> = new Set([
  "NO_NODES_AVAILABLE",
  "SERVER_STARTING_UP",
  "SERVER_SHUTTING_DOWN",
  "REMOTE_HOST_GONE",
  "TOO_MANY_REQUESTS_FAILED",
  "PAGE_TRANSPORT_TIMEOUT",
  "REMOTE_TASK_ERROR"
])

const classifyQueryError = (error: QueryError, props: ReasonProps): SqlErrorReason => {
  const name = error.errorName
  if (name === "PERMISSION_DENIED") {
    return new AuthorizationError(props)
  }
  if (name === "CONSTRAINT_VIOLATION") {
    return new ConstraintError(props)
  }
  if (name === "TRANSACTION_CONFLICT") {
    return new SerializationError(props)
  }
  if (timeoutErrorNames.has(name)) {
    return new StatementTimeoutError(props)
  }
  if (connectionErrorNames.has(name) || isNotReady(error)) {
    return new ConnectionError(props)
  }
  if (error.errorType === "USER_ERROR" && syntaxErrorNames.has(name)) {
    return new SqlSyntaxError(props)
  }
  return new UnknownError(props)
}

interface ReasonProps {
  readonly cause: unknown
  readonly message: string
  readonly operation: string
}

const failureMessage = (failure: TrinoFailure): string => {
  switch (failure._tag) {
    case "QueryFailed":
      return failure.error.message
    case "HttpStatusFailure":
      return `TrinoClient: HTTP ${failure.status} from the coordinator`
    case "TransportFailure":
      return "TrinoClient: Failed to reach the coordinator"
    case "ProtocolViolation":
    case "DecodeFailure":
    case "EncodeFailure":
    case "Unsupported":
      return failure.message
  }
}

/**
 * Classifies an internal failure as a `SqlErrorReason`.
 */
export const classify = (failure: TrinoFailure): SqlErrorReason => {
  const props: ReasonProps = {
    cause: failure,
    message: failureMessage(failure),
    operation: failure._tag === "DecodeFailure"
      ? "decode"
      : failure._tag === "EncodeFailure"
      ? "execute"
      : failure.operation
  }
  switch (failure._tag) {
    case "QueryFailed":
      return classifyQueryError(failure.error, props)
    case "HttpStatusFailure":
      if (failure.status === 401) {
        return new AuthenticationError(props)
      }
      if (failure.status === 403) {
        return new AuthorizationError(props)
      }
      if (failure.status === 502 || failure.status === 503 || failure.status === 504) {
        return new ConnectionError(props)
      }
      return new UnknownError(props)
    case "TransportFailure":
      return new ConnectionError(props)
    case "ProtocolViolation":
    case "DecodeFailure":
    case "EncodeFailure":
    case "Unsupported":
      return new UnknownError(props)
  }
}

/**
 * Wraps an internal failure in a `SqlError`.
 */
export const toSqlError = (failure: TrinoFailure): SqlError => new SqlError({ reason: classify(failure) })
