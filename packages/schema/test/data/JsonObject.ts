import * as JsonObject from "@fp-ts/schema/data/JsonObject"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe("JsonObject", () => {
  const schema = JsonObject.Schema

  it("id", () => {
    expect(JsonObject.id).exist
  })

  it("Provider", () => {
    expect(JsonObject.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty({ a: [1, true] })).toEqual("{\"a\":[1,true]}")
  })
})
