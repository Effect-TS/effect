import { Effect } from "effect"
import * as Statement from "effect/sql/Statement"
import { describe, expect, it } from "vitest"

import { makeCompiler } from "@effect/sql-clickhouse-native/ClickHouseNativeSqlConnection"

const statement = Statement.make(Effect.void as never, makeCompiler(), [], undefined)

describe("ClickHouse Native TCP SQL compiler", () => {
  it("renders typed placeholders and preserves values as binds", () => {
    const [query, parameters] = statement`SELECT ${1.5} AS float_value, ${"native's TCP"} AS text_value, ${[
      true,
      2
    ]} AS values`
      .compile()

    expect(query).toBe("SELECT {p1: Float64} AS float_value, {p2: String} AS text_value, {p3: Array(Bool)} AS values")
    expect(parameters).toEqual([1.5, "native's TCP", [true, 2]])
  })

  it("does not interpolate non-finite values into SQL", () => {
    const [query, parameters] = statement`SELECT ${Number.NaN}`.compile()

    expect(query).toBe("SELECT {p1: Float64}")
    expect(parameters).toEqual([Number.NaN])
  })
})
