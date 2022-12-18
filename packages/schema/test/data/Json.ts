import * as AST from "@fp-ts/schema/AST"
import * as _ from "@fp-ts/schema/data/Json"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Json", () => {
  const schema = _.Schema

  it("exports", () => {
    expect(_.id).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("keyof", () => {
    expect(AST.keyof(schema.ast)).toEqual([])
  })

  it("Provider", () => {
    expect(_.Provider).exist
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty({ a: [1, true] })).toEqual("{\"a\":[1,true]}")
  })
})
