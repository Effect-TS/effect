import { describe, expect, it } from "vitest"

import {
  ClickHouseNativeError,
  ClickHouseServerError,
  toSqlError
} from "@effect/sql-clickhouse-native/ClickHouseNativeClient"
import {
  AuthenticationError,
  AuthorizationError,
  ConnectionError,
  ConstraintError,
  DeadlockError,
  LockTimeoutError,
  SerializationError,
  SqlSyntaxError,
  StatementTimeoutError,
  UnknownError
} from "effect/sql/SqlError"

const serverFailure = (code: number, name: string) =>
  new ClickHouseServerError({
    code,
    name,
    serverMessage: name
  })

describe("ClickHouse Native TCP SqlError classification", () => {
  it.each(
    [
      [new ClickHouseNativeError({ cause: new Error("socket closed") }), ConnectionError, true],
      [serverFailure(516, "AUTHENTICATION_FAILED"), AuthenticationError, false],
      [serverFailure(291, "DATABASE_ACCESS_DENIED"), AuthorizationError, false],
      [serverFailure(481, "PATH_ACCESS_DENIED"), AuthorizationError, false],
      [serverFailure(482, "DICTIONARY_ACCESS_DENIED"), AuthorizationError, false],
      [serverFailure(497, "ACCESS_DENIED"), AuthorizationError, false],
      [serverFailure(673, "RESOURCE_ACCESS_DENIED"), AuthorizationError, false],
      [serverFailure(711, "FILECACHE_ACCESS_DENIED"), AuthorizationError, false],
      [serverFailure(6, "CANNOT_PARSE_TEXT"), SqlSyntaxError, false],
      [serverFailure(25, "CANNOT_PARSE_ESCAPE_SEQUENCE"), SqlSyntaxError, false],
      [serverFailure(26, "CANNOT_PARSE_QUOTED_STRING"), SqlSyntaxError, false],
      [serverFailure(27, "CANNOT_PARSE_INPUT_ASSERTION_FAILED"), SqlSyntaxError, false],
      [serverFailure(36, "BAD_ARGUMENTS"), SqlSyntaxError, false],
      [serverFailure(38, "CANNOT_PARSE_DATE"), SqlSyntaxError, false],
      [serverFailure(41, "CANNOT_PARSE_DATETIME"), SqlSyntaxError, false],
      [serverFailure(62, "SYNTAX_ERROR"), SqlSyntaxError, false],
      [serverFailure(72, "CANNOT_PARSE_NUMBER"), SqlSyntaxError, false],
      [serverFailure(80, "INCORRECT_QUERY"), SqlSyntaxError, false],
      [serverFailure(159, "TIMEOUT_EXCEEDED"), StatementTimeoutError, true],
      [serverFailure(160, "TOO_SLOW"), StatementTimeoutError, true],
      [serverFailure(0, "LOCK_TIMEOUT"), LockTimeoutError, true],
      [serverFailure(469, "VIOLATED_CONSTRAINT"), ConstraintError, false],
      [serverFailure(473, "DEADLOCK_AVOIDED"), DeadlockError, true],
      [serverFailure(650, "SERIALIZATION_ERROR"), SerializationError, true],
      [serverFailure(242, "TABLE_IS_READ_ONLY"), UnknownError, false],
      [serverFailure(999, "UNMAPPED"), UnknownError, false]
    ] as const
  )("maps %s to %s", (cause, tag, retryable) => {
    const error = toSqlError(cause, "execute")

    expect(error.reason).toBeInstanceOf(tag)
    expect(error.reason.operation).toBe("execute")
    expect(error.isRetryable).toBe(retryable)
  })

  it("preserves an unmapped server error as the SqlError cause", () => {
    const cause = serverFailure(242, "TABLE_IS_READ_ONLY")
    const error = toSqlError(cause, "execute")

    expect(error.reason).toBeInstanceOf(UnknownError)
    expect(error.reason.cause).toBe(cause)
  })
})
