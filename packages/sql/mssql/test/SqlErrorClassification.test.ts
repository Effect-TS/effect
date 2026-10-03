import { classifyError } from "@effect/sql-mssql/internal/sqlError"
import { assert, describe, it } from "@effect/vitest"
import type * as SqlError from "effect/sql/SqlError"

const reason = (cause: unknown, fallback?: "connection" | "unknown") =>
  classifyError({ cause, message: "failed", operation: "execute" }, fallback)

const assertUniqueViolation = (reason: SqlError.SqlErrorReason, constraint: string) => {
  assert.strictEqual(reason._tag, "UniqueViolation")
  if (reason._tag === "UniqueViolation") {
    assert.strictEqual(reason.constraint, constraint)
  }
}

describe("MssqlConnection SqlError classification", () => {
  it("maps representative error numbers to reasons", () => {
    const cases = [
      [233, "ConnectionError"],
      [18456, "AuthenticationError"],
      [229, "AuthorizationError"],
      [102, "SqlSyntaxError"],
      [2601, "UniqueViolation"],
      [2627, "UniqueViolation"],
      [547, "ConstraintError"],
      [1205, "DeadlockError"],
      [3960, "SerializationError"],
      [1222, "LockTimeoutError"]
    ] as const

    for (const [number, expectedTag] of cases) {
      assert.strictEqual(reason({ number })._tag, expectedTag)
    }
  })

  it("falls back to UnknownError or ConnectionError for unmapped error numbers", () => {
    assert.strictEqual(reason({ number: 99999 })._tag, "UnknownError")
    assert.strictEqual(reason(new Error("socket closed"), "connection")._tag, "ConnectionError")
  })

  it("classifies duplicate-key number 2601 as UniqueViolation and extracts the unique index", () => {
    assertUniqueViolation(
      reason({
        number: 2601,
        message:
          "Cannot insert duplicate key row in object 'dbo.Users' with unique index 'IX_Users_Email'. The duplicate key value is (user@example.com)."
      }),
      "IX_Users_Email"
    )
  })

  it("classifies constraint number 2627 as UniqueViolation and extracts the constraint", () => {
    assertUniqueViolation(
      reason({
        number: 2627,
        message:
          "Violation of UNIQUE KEY constraint 'UQ_Users_Email'. Cannot insert duplicate key in object 'dbo.Users'. The duplicate key value is (user@example.com)."
      }),
      "UQ_Users_Email"
    )
  })

  it("prefers structured constraints and trims whitespace", () => {
    assertUniqueViolation(
      reason({
        number: 2601,
        constraint: "  IX_Structured_Email  ",
        message:
          "Cannot insert duplicate key row in object 'dbo.Users' with unique index 'IX_Users_Email'. The duplicate key value is (user@example.com)."
      }),
      "IX_Structured_Email"
    )
  })

  it("uses unknown for blank, missing, malformed, or non-string unique violation metadata", () => {
    assertUniqueViolation(reason({ number: 2601 }), "unknown")
    assertUniqueViolation(
      reason({
        number: 2627,
        constraint: "   ",
        message: "Violation of UNIQUE KEY constraint '   '. Cannot insert duplicate key in object 'dbo.Users'."
      }),
      "unknown"
    )
    assertUniqueViolation(
      reason({ number: 2601, message: "Cannot insert duplicate key row in object 'dbo.Users'." }),
      "unknown"
    )
    assertUniqueViolation(
      reason({
        number: 2627,
        constraint: 2627,
        message: { text: "Violation of UNIQUE KEY constraint 'UQ_Users_Email'." }
      }),
      "unknown"
    )
  })

  it("keeps non-unique constraint number 547 classified as ConstraintError", () => {
    assert.strictEqual(reason({ number: 547 })._tag, "ConstraintError")
  })
})
