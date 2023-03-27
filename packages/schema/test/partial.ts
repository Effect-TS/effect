import { pipe } from "@effect/data/Function"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.numberFromString(S.string)

describe.concurrent("partial", () => {
  it("partial/tuple/ e", async () => {
    const schema = S.partial(S.tuple(NumberFromString))
    await Util.expectParseSuccess(schema, ["1"], [1])
    await Util.expectParseSuccess(schema, [], [])
  })

  it("partial/tuple/ e + r", async () => {
    const schema = S.partial(pipe(S.tuple(NumberFromString), S.rest(NumberFromString)))
    await Util.expectParseSuccess(schema, ["1"], [1])
    await Util.expectParseSuccess(schema, [], [])
    await Util.expectParseSuccess(schema, ["1", "2"], [1, 2])
    await Util.expectParseSuccess(schema, ["1", undefined], [1, undefined])
  })

  it("partial/record", async () => {
    const schema = S.partial(S.record(S.string, NumberFromString))
    await Util.expectParseSuccess(schema, {}, {})
    await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
  })

  it("partial/refinement primitive", async () => {
    expect(() => S.partial(pipe(S.string, S.minLength(2)))).toThrowError(
      new Error("`partial` cannot handle refinements or transformations")
    )
  })
})
