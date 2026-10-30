import { Effect, hole } from "effect"
import type { SqlClient, SqlError, Statement } from "effect/sql"
import { describe, expect, it } from "tstyche"

describe("SqlClient", () => {
  it("reactive queries accept any keys when no keys are declared", () => {
    const sql = hole<SqlClient.SqlClient>()
    const effect = Effect.succeed(1)
    const keys = hole<ReadonlyArray<unknown>>()

    expect(sql.reactive).type.toBeCallableWith(keys, effect)
    expect(sql.reactiveMailbox).type.toBeCallableWith({ anything: [1, { id: 1 }] }, effect)
  })

  it("batch types each result from its statement", () => {
    const sql = hole<SqlClient.SqlClient>()
    const a = hole<Statement.Statement<{ readonly a: number }>>()
    const b = hole<Statement.Statement<{ readonly b: string }>>()

    expect(sql.batch([a, b])).type.toBe<
      Effect.Effect<
        readonly [ReadonlyArray<{ readonly a: number }>, ReadonlyArray<{ readonly b: string }>],
        SqlError.SqlError
      >
    >()
  })
})
