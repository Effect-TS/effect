import { pipe } from "@fp-ts/core/Function"
import * as _ from "@fp-ts/schema/data/filter"
import * as P from "@fp-ts/schema/Parser"
import * as S from "@fp-ts/schema/Schema"

describe.concurrent("pattern", () => {
  it("Guard", () => {
    const schema = pipe(S.string, S.pattern(/^abb+$/))
    const is = P.is(schema)
    expect(is("abb")).toEqual(true)
    expect(is("abbb")).toEqual(true)

    expect(is("ab")).toEqual(false)
    expect(is("a")).toEqual(false)
  })
})
