import { classifyErr, classifyErrno, constraintFromMessage } from "@effect/sql-mysql/internal/sqlError"
import { assert, describe, it } from "@effect/vitest"
import type { UniqueViolation } from "effect/unstable/sql/SqlError"

const props = { cause: new Error("boom"), message: "test", operation: "execute" }

const tagOf = (
  errno: number | undefined,
  sqlState: string | undefined,
  message?: string
): string => classifyErrno(errno, sqlState, message, props)._tag

describe("error classification", () => {
  describe("by error number", () => {
    const cases: ReadonlyArray<readonly [number, string]> = [
      [1040, "ConnectionError"], // too many connections
      [1129, "ConnectionError"], // host blocked
      [1203, "ConnectionError"], // user exceeded max connections
      [1045, "AuthenticationError"], // access denied
      [1044, "AuthorizationError"], // access denied for database
      [1142, "AuthorizationError"], // command denied
      [1064, "SqlSyntaxError"], // parse error
      [1054, "SqlSyntaxError"], // unknown column
      [1146, "SqlSyntaxError"], // table does not exist
      [1062, "UniqueViolation"], // duplicate entry
      [1048, "ConstraintError"], // column cannot be null
      [1452, "ConstraintError"], // foreign key
      [1213, "DeadlockError"],
      [1205, "LockTimeoutError"],
      [3024, "StatementTimeoutError"]
    ]
    for (const [errno, expected] of cases) {
      it(`maps ${errno} to ${expected}`, () => {
        assert.strictEqual(tagOf(errno, undefined), expected)
      })
    }
  })

  describe("by SQLSTATE class, for numbers the table does not name", () => {
    // 9999 is deliberately absent from every errno set, so these prove the
    // SQLSTATE fallback rather than the table.
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["40001", "SerializationError"],
      ["08S01", "ConnectionError"],
      ["28000", "AuthenticationError"],
      ["42S02", "SqlSyntaxError"],
      ["23000", "ConstraintError"]
    ]
    for (const [state, expected] of cases) {
      it(`maps SQLSTATE ${state} to ${expected}`, () => {
        assert.strictEqual(tagOf(9999, state), expected)
      })
    }
  })

  it("prefers the error number over the SQLSTATE class", () => {
    // 1213 is a deadlock, and MySQL reports it under SQLSTATE 40001, which
    // alone would say SerializationError. Retrying differs between the two,
    // so the more specific number has to win.
    assert.strictEqual(tagOf(1213, "40001"), "DeadlockError")
    // 1045 arrives with 28000, which agrees; 1044 arrives with 42000, which
    // does not, and authorization is the accurate answer.
    assert.strictEqual(tagOf(1044, "42000"), "AuthorizationError")
  })

  it("falls back to UnknownError when neither is recognised", () => {
    assert.strictEqual(tagOf(9999, "HY000"), "UnknownError")
    assert.strictEqual(tagOf(undefined, undefined), "UnknownError")
  })

  describe("duplicate-entry constraint names", () => {
    const constraintOf = (message: string): string =>
      (classifyErrno(1062, "23000", message, props) as UniqueViolation).constraint

    it("reads a single-quoted index name", () => {
      assert.strictEqual(
        constraintOf("Duplicate entry 'a' for key 'users.email_unique'"),
        "users.email_unique"
      )
    })
    it("reads a backtick-quoted index name", () => {
      assert.strictEqual(constraintOf("Duplicate entry 'a' for key `PRIMARY`"), "PRIMARY")
    })
    it("reads an unquoted index name", () => {
      assert.strictEqual(constraintOf("Duplicate entry 'a' for key PRIMARY"), "PRIMARY")
    })
    it("reports unknown when the message names no key", () => {
      assert.strictEqual(constraintOf("Duplicate entry 'a'"), "unknown")
      assert.strictEqual(constraintFromMessage(undefined), "unknown")
      assert.strictEqual(constraintFromMessage("for key '   '"), "unknown")
    })
  })

  it("carries the server's number, state and message onto the cause", () => {
    const reason = classifyErr(
      { code: 1062, sqlState: "23000", message: "Duplicate entry 'a' for key 'PRIMARY'" },
      "MysqlConnection: Failed to execute statement",
      "execute"
    )
    assert.strictEqual(reason._tag, "UniqueViolation")
    const cause = reason.cause as { errno: number; sqlState: string; sqlMessage: string }
    assert.strictEqual(cause.errno, 1062)
    assert.strictEqual(cause.sqlState, "23000")
    assert.include(cause.sqlMessage, "Duplicate entry")
  })
})
