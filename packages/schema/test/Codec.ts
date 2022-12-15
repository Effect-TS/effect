import * as AST from "@fp-ts/schema/AST"
import * as _ from "@fp-ts/schema/Codec"
import * as S from "@fp-ts/schema/Schema"

describe("Codec", () => {
  it("exports", () => {
    expect(_.make).exist
    expect(_.filter).exist
    expect(_.filterWith).exist
    expect(_.refine).exist
    expect(_.string).exist
    expect(_.number).exist
    expect(_.boolean).exist
    expect(_.bigint).exist
    expect(_.unknown).exist
    expect(_.any).exist
    expect(_.never).exist
    expect(_.json).exist
  })

  it("parseOrThrow", () => {
    const Person = _.struct({
      firstName: _.string,
      lastName: _.string
    }, {
      age: _.number
    })

    const person = Person.of({ firstName: "Michael", lastName: "Arnaldi" })
    const string = Person.stringify(person)

    expect(string).toEqual(`{"firstName":"Michael","lastName":"Arnaldi"}`)
    expect(Person.parseOrThrow(string)).toEqual(person)
  })

  it("union simulation", () => {
    const c = S.struct({ c: S.number, _tag: S.literal("C") })
    const ab = S.struct({ a: S.string, b: S.boolean, _tag: S.literal("AB") })
    const schema = S.union(c, ab)
    expect(schema.ast).toEqual({
      _tag: "Union",
      members: [
        {
          _tag: "Struct",
          fields: [
            AST.field("_tag", AST.literalType("AB"), false, true),
            AST.field("b", AST.booleanKeyword, false, true),
            AST.field("a", AST.stringKeyword, false, true)
          ],
          indexSignatures: []
        },
        {
          _tag: "Struct",
          fields: [
            AST.field("_tag", AST.literalType("C"), false, true),
            AST.field("c", AST.numberKeyword, false, true)
          ],
          indexSignatures: []
        }
      ]
    })
    const codec = _.codecFor(schema)
    expect(codec.decode({ _tag: "C", c: 1 })).toEqual(_.success({ _tag: "C", c: 1 }))
  })
})
