import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as _ from "@fp-ts/schema/data/Either"
import { parseNumber } from "@fp-ts/schema/data/String"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const NumberFromString = pipe(S.string, parseNumber)

describe.concurrent("Either", () => {
  it("either. property tests", () => {
    Util.property(_.either(S.string, S.number))
  })

  it("either. Guard", () => {
    const schema = _.either(S.string, S.number)
    const is = P.is(schema)
    expect(is(E.left("a"))).toEqual(true)
    expect(is(E.right(1))).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is(E.right("a"))).toEqual(false)
    expect(is(E.left(1))).toEqual(false)

    expect(is({ _tag: "Right", right: 1 })).toEqual(false)
    expect(is({ _tag: "Left", left: "a" })).toEqual(false)
  })

  it("either. Decoder", () => {
    const schema = _.either(S.string, NumberFromString)
    Util.expectDecodingSuccess(schema, E.left("a"), E.left("a"))
    Util.expectDecodingSuccess(schema, E.right("1"), E.right(1))
  })

  it("either. Pretty", () => {
    const schema = _.either(S.string, S.number)
    const pretty = Pretty.pretty(schema)
    expect(pretty(E.left("a"))).toEqual(`left("a")`)
    expect(pretty(E.right(1))).toEqual("right(1)")
  })
})
