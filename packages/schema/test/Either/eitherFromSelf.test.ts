import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as E from "effect/Either"
import { describe, expect, it } from "vitest"

describe("Either/eitherFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.eitherFromSelf(S.string, S.number))
  })

  it("is", () => {
    const schema = S.eitherFromSelf(S.string, S.number)
    const is = P.is(schema)
    expect(is(E.left("a"))).toEqual(true)
    expect(is(E.right(1))).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is(E.right("a"))).toEqual(false)
    expect(is(E.left(1))).toEqual(false)

    expect(is({ _tag: "Right", right: 1 })).toEqual(false)
    expect(is({ _tag: "Left", left: "a" })).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.eitherFromSelf(S.string, S.NumberFromString)
    await Util.expectParseSuccess(schema, E.left("a"), E.left("a"))
    await Util.expectParseSuccess(schema, E.right("1"), E.right(1))
  })

  it("pretty", () => {
    const schema = S.eitherFromSelf(S.string, S.number)
    const pretty = Pretty.to(schema)
    expect(pretty(E.left("a"))).toEqual(`left("a")`)
    expect(pretty(E.right(1))).toEqual("right(1)")
  })
})
