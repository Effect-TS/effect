import * as _ from "@fp-ts/schema/data/Json"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Json", () => {
  it("property tests. json", () => {
    Util.property(_.json)
  })

  it("Pretty", () => {
    const pretty = P.pretty(_.json)
    expect(pretty({ a: [1, true] })).toEqual(`{ "a": [1, true] }`)
  })
})
