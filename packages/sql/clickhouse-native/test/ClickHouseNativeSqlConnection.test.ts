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
  SqlSyntaxError,
  StatementTimeoutError,
  UnknownError
} from "effect/sql/SqlError"

describe("ClickHouse Native SQL error mapping", () => {
  it.each(
    [
      [
        new ClickHouseNativeError({
          cause: new Error("socket closed")
        }),
        ConnectionError
      ],
      [
        new ClickHouseServerError({
          code: 516,
          name: "AUTHENTICATION_FAILED",
          serverMessage: "bad password"
        }),
        AuthenticationError
      ],
      [
        new ClickHouseServerError({
          code: 497,
          name: "ACCESS_DENIED",
          serverMessage: "denied"
        }),
        AuthorizationError
      ],
      [
        new ClickHouseServerError({
          code: 62,
          name: "SYNTAX_ERROR",
          serverMessage: "bad SQL"
        }),
        SqlSyntaxError
      ],
      [
        new ClickHouseServerError({
          code: 159,
          name: "TIMEOUT_EXCEEDED",
          serverMessage: "slow"
        }),
        StatementTimeoutError
      ],
      [
        new ClickHouseServerError({
          code: 999,
          name: "UNKNOWN",
          serverMessage: "unknown"
        }),
        UnknownError
      ]
    ] as const
  )("maps %s to %s", (cause, tag) => {
    const error = toSqlError(cause, "execute")

    expect(error.reason).toBeInstanceOf(tag)
    expect(error.reason.operation).toBe("execute")
  })
})
