import {
  DecodeFailure,
  HttpStatusFailure,
  ProtocolViolation,
  type QueryError,
  QueryFailed,
  TransportFailure,
  Unsupported
} from "@effect/sql-trino/internal/failure"
import { classify, toSqlError } from "@effect/sql-trino/internal/sqlError"
import { assert, describe, it } from "@effect/vitest"

const queryError = (errorName: string, errorType = "USER_ERROR"): QueryError => ({
  message: `failed with ${errorName}`,
  sqlState: undefined,
  errorCode: 1,
  errorName,
  errorType,
  errorLocation: undefined,
  failureInfo: undefined
})

const queryFailed = (errorName: string, errorType?: string) =>
  new QueryFailed({
    queryId: "20261112_000000_00000_abcde",
    error: queryError(errorName, errorType),
    operation: "execute"
  })

describe("SqlErrorClassification", () => {
  it("classifies server-reported query failures by error name", () => {
    assert.strictEqual(classify(queryFailed("SYNTAX_ERROR"))._tag, "SqlSyntaxError")
    assert.strictEqual(classify(queryFailed("TABLE_NOT_FOUND"))._tag, "SqlSyntaxError")
    assert.strictEqual(classify(queryFailed("TYPE_MISMATCH"))._tag, "SqlSyntaxError")
    assert.strictEqual(classify(queryFailed("PERMISSION_DENIED"))._tag, "AuthorizationError")
    assert.strictEqual(classify(queryFailed("CONSTRAINT_VIOLATION"))._tag, "ConstraintError")
    assert.strictEqual(classify(queryFailed("TRANSACTION_CONFLICT"))._tag, "SerializationError")
    assert.strictEqual(
      classify(queryFailed("EXCEEDED_TIME_LIMIT", "INSUFFICIENT_RESOURCES"))._tag,
      "StatementTimeoutError"
    )
    assert.strictEqual(classify(queryFailed("NO_NODES_AVAILABLE", "INSUFFICIENT_RESOURCES"))._tag, "ConnectionError")
    assert.strictEqual(
      classify(
        new QueryFailed({
          queryId: undefined,
          error: {
            ...queryError("GENERIC_INSUFFICIENT_RESOURCES", "INSUFFICIENT_RESOURCES"),
            message:
              "Insufficient active worker nodes. Waited 5.00m for at least 1 workers, but only 0 workers are active"
          },
          operation: "execute"
        })
      )._tag,
      "ConnectionError"
    )
    assert.strictEqual(
      classify(queryFailed("GENERIC_INSUFFICIENT_RESOURCES", "INSUFFICIENT_RESOURCES"))._tag,
      "UnknownError"
    )
    assert.strictEqual(
      classify(
        new QueryFailed({
          queryId: undefined,
          error: { ...queryError("GENERIC_INTERNAL_ERROR", "INTERNAL_ERROR"), message: "nodes is empty" },
          operation: "execute"
        })
      )._tag,
      "ConnectionError"
    )
    assert.strictEqual(classify(queryFailed("GENERIC_INTERNAL_ERROR", "INTERNAL_ERROR"))._tag, "UnknownError")
    assert.strictEqual(classify(queryFailed("DIVISION_BY_ZERO"))._tag, "UnknownError")
  })

  it("only treats user errors as syntax errors", () => {
    assert.strictEqual(classify(queryFailed("NOT_SUPPORTED", "INTERNAL_ERROR"))._tag, "UnknownError")
  })

  it("classifies HTTP statuses and transport failures", () => {
    const status = (code: number) => new HttpStatusFailure({ status: code, body: "", operation: "execute" })
    assert.strictEqual(classify(status(401))._tag, "AuthenticationError")
    assert.strictEqual(classify(status(403))._tag, "AuthorizationError")
    assert.strictEqual(classify(status(503))._tag, "ConnectionError")
    assert.strictEqual(classify(status(400))._tag, "UnknownError")
    assert.strictEqual(
      classify(new TransportFailure({ cause: new Error("ECONNREFUSED"), operation: "connect" }))._tag,
      "ConnectionError"
    )
  })

  it("classifies client-side failures as unknown and keeps the failure as the cause", () => {
    const failures = [
      new ProtocolViolation({ message: "missing nextUri", operation: "poll" }),
      new DecodeFailure({ message: "not a bigint", column: "id", cause: undefined }),
      new Unsupported({ message: "zstd is not available", operation: "spool" })
    ]
    for (const failure of failures) {
      const error = toSqlError(failure)
      assert.strictEqual(error.reason._tag, "UnknownError")
      assert.strictEqual(error.reason.cause, failure)
      assert.strictEqual(error.message, failure.message)
    }
  })

  it("carries the Trino message and the failed operation", () => {
    const error = toSqlError(queryFailed("SYNTAX_ERROR"))
    assert.strictEqual(error.message, "failed with SYNTAX_ERROR")
    assert.strictEqual(error.reason.operation, "execute")
    assert.isFalse(error.isRetryable)
  })
})
