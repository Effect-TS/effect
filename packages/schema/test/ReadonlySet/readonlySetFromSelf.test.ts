import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("ReadonlySet/readonlySetFromSelf", () => {
  it("keyof", () => {
    expect(S.keyof(S.readonlySetFromSelf(S.number))).toEqual(S.literal("size"))
  })

  it("property tests", () => {
    Util.roundtrip(S.readonlySetFromSelf(S.number))
  })

  it("decoding", async () => {
    const schema = S.readonlySetFromSelf(S.NumberFromString)
    await Util.expectParseSuccess(schema, new Set(), new Set())
    await Util.expectParseSuccess(schema, new Set(["1", "2", "3"]), new Set([1, 2, 3]))

    await Util.expectParseFailure(
      schema,
      null,
      `Expected ReadonlySet, actual null`
    )
    await Util.expectParseFailure(
      schema,
      new Set(["1", "a", "3"]),
      `/1 Expected string <-> number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.readonlySetFromSelf(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, new Set(), new Set())
    await Util.expectEncodeSuccess(schema, new Set([1, 2, 3]), new Set(["1", "2", "3"]))
  })

  it("is", () => {
    const schema = S.readonlySetFromSelf(S.string)
    const is = P.is(schema)
    expect(is(new Set())).toEqual(true)
    expect(is(new Set(["a", "b", "c"]))).toEqual(true)

    expect(is(new Set(["a", "b", 1]))).toEqual(false)
    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
  })

  it("pretty", () => {
    const schema = S.readonlySetFromSelf(S.string)
    const pretty = Pretty.to(schema)
    expect(pretty(new Set())).toEqual("new Set([])")
    expect(pretty(new Set(["a", "b"]))).toEqual(
      `new Set(["a", "b"])`
    )
  })
})
