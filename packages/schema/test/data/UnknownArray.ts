import * as UnknownArray from "@fp-ts/schema/data/UnknownArray"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe("UnknownArray", () => {
  const schema = UnknownArray.Schema

  it("id", () => {
    expect(UnknownArray.id).exist
  })

  it("Provider", () => {
    expect(UnknownArray.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty([1, true])).toEqual("[1,true]")
  })
})
