import * as UnknownObject from "@fp-ts/schema/data/UnknownObject"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe("UnknownObject", () => {
  const schema = UnknownObject.Schema

  it("id", () => {
    expect(UnknownObject.id).exist
  })

  it("Provider", () => {
    expect(UnknownObject.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty({ a: [1, true] })).toEqual("{\"a\":[1,true]}")
  })
})
