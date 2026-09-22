import { Effect } from "effect"
import * as Statement from "effect/unstable/sql/Statement"
import { describe, expect, it } from "vitest"

import { makeCompiler } from "../src/ClickHouseNativeSqlConnection.js"

const statement = Statement.make(Effect.void as never, makeCompiler(), [], undefined)

describe("ClickHouse Native TCP SQL compiler", () => {
  it("renders immutable JavaScript values as ClickHouse literals", () => {
    const [query] = statement`SELECT ${1.5} AS float_value, ${"native's TCP"} AS text_value, ${[true, 2]} AS values`
      .compile()

    expect(query).toBe("SELECT 1.5 AS float_value, 'native\\'s TCP' AS text_value, [true, 2] AS values")
  })

  it("rejects non-finite numeric parameters before a packet is written", () => {
    expect(() => statement`SELECT ${Number.NaN}`.compile()).toThrow("finite numbers")
    expect(() => statement`SELECT ${Number.POSITIVE_INFINITY}`.compile()).toThrow("finite numbers")
  })
})
