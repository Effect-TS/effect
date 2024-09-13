import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("afterOrEqualTo", () => {
  const referenceDate = new Date("2023-01-01T00:00:00.000Z")
  const schema = S.afterOrEqualTo(referenceDate)(S.Date)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is(new Date("2023-01-01T00:00:00.000Z"))).toEqual(true)
    expect(is(new Date("2023-01-01T00:00:00.001Z"))).toEqual(true)
    expect(is(new Date("2022-12-31T23:59:59.999Z"))).toEqual(false)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "2023-01-01T00:00:00.000Z", new Date("2023-01-01T00:00:00.000Z"))
    await Util.expectDecodeUnknownSuccess(schema, "2023-01-01T00:00:00.001Z", new Date("2023-01-01T00:00:00.001Z"))
    //     await Util.expectDecodeUnknownFailure(
    //       schema,
    //       new Date("2022-12-31T23:59:59.999Z"),
    //       `a date after or equal to 2023-01-01T00:00:00.000Z
    // └─ Predicate refinement failure
    //    └─ Expected a date after or equal to 2023-01-01T00:00:00.000Z, actual 2022-12-31T23:59:59.999Z`
    //     )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(new Date("2023-01-02T00:00:00.000Z"))).toEqual("new Date(\"2023-01-02T00:00:00.000Z\")")
  })
})
