import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

const schema = S.Int

describe("number/int", () => {
  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(0.5)).toEqual(false)
    expect(is(Number.MAX_SAFE_INTEGER + 1)).toEqual(false)
    expect(is(Number.MIN_SAFE_INTEGER - 1)).toEqual(false)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, 0)
    await Util.expectParseSuccess(schema, 1)
    await Util.expectParseFailure(schema, 0.5, `Expected integer, actual 0.5`)
  })

  it("pretty", () => {
    const pretty = Pretty.to(schema)
    expect(pretty(1)).toEqual("1")
  })
})
