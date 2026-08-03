import { ClickhouseClient } from "@effect/sql-clickhouse"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Statement from "effect/unstable/sql/Statement"

describe("ClickhouseClient", () => {
  it("preserves fractional JavaScript numbers in inferred parameters", () => {
    const sql = Statement.make(Effect.void as any, ClickhouseClient.makeCompiler(), [], undefined)
    const [query] = sql`SELECT ${1.5}`.compile()

    assert.strictEqual(query, "SELECT {p1: Float64}")
  })
})
