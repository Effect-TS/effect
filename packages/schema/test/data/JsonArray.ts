import * as JsonArray from "@fp-ts/schema/data/JsonArray"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe("JsonArray", () => {
  const schema = JsonArray.Schema

  it("id", () => {
    expect(JsonArray.id).exist
  })

  it("Provider", () => {
    expect(JsonArray.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty([1, true])).toEqual("[1,true]")
  })
})
