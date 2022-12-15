import * as AST from "@fp-ts/schema/AST"
import * as C from "@fp-ts/schema/Codec"
import * as S from "@fp-ts/schema/Schema"

/*
const codec: C.Codec<{
    readonly a: string;
    readonly b: number;
    readonly c?: boolean | undefined;
}>
*/
export const codec = C.struct({
  a: C.string,
  b: C.number,
  c: C.optional(C.boolean)
})

describe("Codec", () => {
  it("exports", () => {
    expect(C.make).exist
    expect(C.filter).exist
    expect(C.filterWith).exist
    expect(C.refine).exist
    expect(C.string).exist
    expect(C.number).exist
    expect(C.boolean).exist
    expect(C.bigint).exist
    expect(C.unknown).exist
    expect(C.any).exist
    expect(C.never).exist
    expect(C.json).exist
  })

  it("parseOrThrow", () => {
    const Person = C.struct({
      firstName: C.string,
      lastName: C.string,
      age: C.optional(C.number)
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
            AST.field("_tag", AST.literalType("AB"), true),
            AST.field("b", AST.booleanKeyword, true),
            AST.field("a", AST.stringKeyword, true)
          ],
          indexSignatures: []
        },
        {
          _tag: "Struct",
          fields: [
            AST.field("_tag", AST.literalType("C"), true),
            AST.field("c", AST.numberKeyword, true)
          ],
          indexSignatures: []
        }
      ]
    })
    const codec = C.codecFor(schema)
    expect(codec.decode({ _tag: "C", c: 1 })).toEqual(C.success({ _tag: "C", c: 1 }))
  })
})
