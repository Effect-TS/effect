import { describe, expect, it } from "vitest"

import { toSqlError } from "../src/ClickHouseNativeClient.js"

const serverFailure = (code: number, name: string) => ({
  _tag: "ClickHouseServerError",
  code,
  name,
  serverMessage: name
})

describe("ClickHouse Native TCP SqlError classification", () => {
  it.each(
    [
      [{ _tag: "ClickHouseNativeError", message: "socket closed" }, "ConnectionError", true],
      [serverFailure(516, "AUTHENTICATION_FAILED"), "AuthenticationError", false],
      [serverFailure(497, "ACCESS_DENIED"), "AuthorizationError", false],
      [serverFailure(62, "SYNTAX_ERROR"), "SqlSyntaxError", false],
      [serverFailure(159, "TIMEOUT_EXCEEDED"), "StatementTimeoutError", true],
      [serverFailure(0, "LOCK_TIMEOUT"), "LockTimeoutError", true],
      [serverFailure(0, "DEADLOCK_AVOIDED"), "DeadlockError", true],
      [serverFailure(0, "SERIALIZATION_ERROR"), "SerializationError", true],
      [serverFailure(0, "UNIQUE_VIOLATION"), "UniqueViolation", false],
      [serverFailure(0, "CONSTRAINT_VIOLATION"), "ConstraintError", false],
      [serverFailure(999, "UNMAPPED"), "UnknownError", false]
    ] as const
  )("maps %s to %s", (cause, tag, retryable) => {
    const error = toSqlError(cause, "execute")

    expect(error.reason._tag).toBe(tag)
    expect(error.reason.operation).toBe("execute")
    expect(error.isRetryable).toBe(retryable)
  })
})
