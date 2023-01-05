import * as _ from "@fp-ts/schema/data/Json"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Json", () => {
  it("exports", () => {
    expect(_.inline).exist
  })

  // TODO: Maximum call stack size exceeded caused by Equal.ts of @fp-ts/data
  it.skip("property tests. inline", () => {
    Util.property(_.inline)
  })

  it("property tests. json", () => {
    Util.property(_.json)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.json)
    expect(pretty.pretty({ a: [1, true] })).toEqual("{\"a\":[1,true]}")
  })
})
