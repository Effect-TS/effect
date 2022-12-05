import * as Any from "@fp-ts/schema/data/Any"
import * as P from "@fp-ts/schema/Pretty"

describe("Any", () => {
  const schema = Any.Schema

  it("pretty", () => {
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(1)).toEqual("1")
  })
})
