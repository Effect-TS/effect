import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Option/optionFromNullish", () => {
  it("property tests", () => {
    Util.roundtrip(S.optionFromNullish(S.number, null))
    Util.roundtrip(S.optionFromNullish(S.number, undefined))
  })

  it("decoding", async () => {
    const schema = S.optionFromNullish(S.NumberFromString, undefined)
    await Util.expectParseSuccess(schema, null, O.none())
    await Util.expectParseSuccess(schema, undefined, O.none())
    await Util.expectParseSuccess(schema, "1", O.some(1))

    expect(O.isOption(S.decodeSync(schema)(null))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)(undefined))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)("1"))).toEqual(true)

    await Util.expectParseFailure(
      schema,
      {},
      `union member: Expected null, actual {}, union member: Expected undefined, actual {}, union member: Expected string, actual {}`
    )
  })

  it("encoding null", async () => {
    const schema = S.optionFromNullish(S.NumberFromString, null)
    await Util.expectEncodeSuccess(schema, O.none(), null)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })

  it("encoding undefined", async () => {
    const schema = S.optionFromNullish(S.NumberFromString, undefined)
    await Util.expectEncodeSuccess(schema, O.none(), undefined)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})
