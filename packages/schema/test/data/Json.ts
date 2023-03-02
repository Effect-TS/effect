import * as _ from "@effect/schema/data/Json"
import * as P from "@effect/schema/Pretty"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Json", () => {
  it("property tests. json", () => {
    Util.property(_.json)
  })

  it("Pretty", () => {
    const pretty = P.pretty(_.json)
    expect(pretty({ a: [1, true] })).toEqual(`{ "a": [1, true] }`)
  })
})
