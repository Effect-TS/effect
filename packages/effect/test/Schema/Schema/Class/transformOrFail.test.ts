import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

class Person extends S.Class<Person>("Person")({
  id: S.Number,
  name: S.String.pipe(S.nonEmptyString())
}) {
  get upperName() {
    return this.name.toUpperCase()
  }
}

const Thing = S.optionalWith(S.Struct({ id: S.Number }), { exact: true, as: "Option" })

class PersonWithTransform extends Person.transformOrFail<PersonWithTransform>("PersonWithTransform")(
  {
    thing: Thing
  },
  {
    decode: (input, _, ast) =>
      input.id === 2 ?
        ParseResult.fail(new ParseResult.Type(ast, input)) :
        ParseResult.succeed({
          ...input,
          thing: Option.some({ id: 123 })
        }),
    encode: (input, _, ast) =>
      input.id === 2 ?
        ParseResult.fail(new ParseResult.Type(ast, input)) :
        ParseResult.succeed(input)
  }
) {
  a() {
    return this.id + "a"
  }
}

describe("transformOrFail", () => {
  it("transformOrFail", async () => {
    const decode = S.decodeSync(PersonWithTransform)
    const person = decode({
      id: 1,
      name: "John"
    })
    expect(PersonWithTransform.fields).toStrictEqual({
      ...Person.fields,
      thing: Thing
    })
    expect(PersonWithTransform.identifier).toStrictEqual("PersonWithTransform")
    expect(person.id).toEqual(1)
    expect(person.name).toEqual("John")
    expect(Option.isSome(person.thing) && person.thing.value.id === 123).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")

    await Util.expectDecodeUnknownFailure(
      PersonWithTransform,
      {
        id: 2,
        name: "John"
      },
      `(PersonWithTransform (Encoded side) <-> PersonWithTransform)
└─ Encoded side transformation failure
   └─ PersonWithTransform (Encoded side)
      └─ Transformation process failure
         └─ Expected PersonWithTransform (Encoded side), actual {"id":2,"name":"John"}`
    )
    await Util.expectEncodeFailure(
      PersonWithTransform,
      new PersonWithTransform({ id: 2, name: "John", thing: Option.some({ id: 1 }) }),
      `(PersonWithTransform (Encoded side) <-> PersonWithTransform)
└─ Encoded side transformation failure
   └─ PersonWithTransform (Encoded side)
      └─ Transformation process failure
         └─ Expected PersonWithTransform (Encoded side), actual {"id":2,"name":"John","thing":{
  "_id": "Option",
  "_tag": "Some",
  "value": {
    "id": 1
  }
}}`
    )
  })

  it("should expose a make constructor", () => {
    const instance = PersonWithTransform.make({ id: 2, name: "John", thing: Option.some({ id: 1 }) })
    expect(instance instanceof PersonWithTransform).toEqual(true)
    expect(instance.a()).toEqual("2a")
  })
})
