import { pipe } from "@effect/data/Function"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const schema = pipe(S.object, S.instanceOf(Set))

describe.concurrent("instanceOf", () => {
  it("Guard", () => {
    const is = P.is(schema)
    expect(is(new Set())).toEqual(true)
    expect(is(1)).toEqual(false)
    expect(is({})).toEqual(false)
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(schema, new Set())
    Util.expectDecodingFailure(schema, 1, `Expected object, actual 1`)
    Util.expectDecodingFailure(schema, {}, `Expected an instance of Set, actual {}`)
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(schema)
    expect(pretty(new Set())).toEqual("{}")
  })
})
