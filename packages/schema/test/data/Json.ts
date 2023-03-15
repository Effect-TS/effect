import * as P from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Json", () => {
  it("property tests. json", () => {
    Util.roundtrip(S.json)
  })

  it("Pretty", () => {
    const pretty = P.to(S.json)
    expect(pretty({ a: [1, true] })).toEqual(`{ "a": [1, true] }`)
  })
})
