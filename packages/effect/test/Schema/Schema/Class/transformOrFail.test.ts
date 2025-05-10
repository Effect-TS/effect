import { describe, it } from "@effect/vitest"
import { assertInstanceOf, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

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
    deepStrictEqual(PersonWithTransform.fields, {
      ...Person.fields,
      thing: Thing
    })
    strictEqual(PersonWithTransform.identifier, "PersonWithTransform")
    strictEqual(person.id, 1)
    strictEqual(person.name, "John")
    assertTrue(Option.isSome(person.thing) && person.thing.value.id === 123)
    strictEqual(person.upperName, "JOHN")
    strictEqual(typeof person.upperName, "string")

    await Util.assertions.decoding.fail(
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
    await Util.assertions.encoding.fail(
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
    assertInstanceOf(instance, PersonWithTransform)
    strictEqual(instance.a(), "2a")
  })
})
