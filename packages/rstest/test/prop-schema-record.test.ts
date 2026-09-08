import { expect, it } from "@effect/rstest"
import { Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

it.prop(
  "plain record properties generate schemas alongside arbitraries",
  {
    count: Arbitrary.schema(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10 }))),
    label: Schema.Literal("schema")
  },
  ({ count, label }) => {
    expect(label).toBe("schema")
    expect(Number.isInteger(count)).toBe(true)
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(10)
  },
  { arbitrary: { runs: 20 } }
)

it.prop(
  "plain record properties retain Arbitrary-only support",
  { value: Arbitrary.schema(Schema.Literal(7)) },
  ({ value }) => {
    expect(value).toBe(7)
  }
)
