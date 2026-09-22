import { describe, expect, it } from "vitest"

import { toSqlError } from "@effect/sql-clickhouse-native/ClickHouseNativeClient"

describe("ClickHouse Native SQL error mapping", () => {
  it.each(
    [
      [{ _tag: "ClickHouseNativeError", message: "socket closed" }, "ConnectionError"],
      [
        { _tag: "ClickHouseServerError", code: 516, name: "AUTHENTICATION_FAILED", serverMessage: "bad password" },
        "AuthenticationError"
      ],
      [
        { _tag: "ClickHouseServerError", code: 497, name: "ACCESS_DENIED", serverMessage: "denied" },
        "AuthorizationError"
      ],
      [{ _tag: "ClickHouseServerError", code: 62, name: "SYNTAX_ERROR", serverMessage: "bad SQL" }, "SqlSyntaxError"],
      [
        { _tag: "ClickHouseServerError", code: 159, name: "TIMEOUT_EXCEEDED", serverMessage: "slow" },
        "StatementTimeoutError"
      ],
      [{ _tag: "ClickHouseServerError", code: 999, name: "UNKNOWN", serverMessage: "unknown" }, "UnknownError"]
    ] as const
  )("maps %s to %s", (cause, tag) => {
    const error = toSqlError(cause, "execute")

    expect(error.reason._tag).toBe(tag)
    expect(error.reason.operation).toBe("execute")
  })
})
