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

class PersonWithTransformFrom extends Person.transformOrFailFrom<PersonWithTransformFrom>("PersonWithTransformFrom")(
  {
    thing: Thing
  },
  {
    decode: (input, _, ast) =>
      input.id === 2 ?
        ParseResult.fail(new ParseResult.Type(ast, input)) :
        ParseResult.succeed({
          ...input,
          thing: { id: 123 }
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

describe("", () => {
  it("transformOrFailFrom", async () => {
    const decode = S.decodeSync(PersonWithTransformFrom)
    const person = decode({
      id: 1,
      name: "John"
    })
    deepStrictEqual(PersonWithTransformFrom.fields, {
      ...Person.fields,
      thing: Thing
    })
    strictEqual(PersonWithTransformFrom.identifier, "PersonWithTransformFrom")
    strictEqual(person.id, 1)
    strictEqual(person.name, "John")
    assertTrue(Option.isSome(person.thing) && person.thing.value.id === 123)
    strictEqual(person.upperName, "JOHN")
    strictEqual(typeof person.upperName, "string")

    await Util.assertions.decoding.fail(
      PersonWithTransformFrom,
      {
        id: 2,
        name: "John"
      },
      `(PersonWithTransformFrom (Encoded side) <-> PersonWithTransformFrom)
└─ Encoded side transformation failure
   └─ PersonWithTransformFrom (Encoded side)
      └─ Transformation process failure
         └─ Expected PersonWithTransformFrom (Encoded side), actual {"id":2,"name":"John"}`
    )
    await Util.assertions.encoding.fail(
      PersonWithTransformFrom,
      new PersonWithTransformFrom({ id: 2, name: "John", thing: Option.some({ id: 1 }) }),
      `(PersonWithTransformFrom (Encoded side) <-> PersonWithTransformFrom)
└─ Encoded side transformation failure
   └─ PersonWithTransformFrom (Encoded side)
      └─ Transformation process failure
         └─ Expected PersonWithTransformFrom (Encoded side), actual {"id":2,"name":"John","thing":{"id":1}}`
    )
  })

  it("should expose a make constructor", () => {
    const instance = PersonWithTransformFrom.make({ id: 2, name: "John", thing: Option.some({ id: 1 }) })
    assertInstanceOf(instance, PersonWithTransformFrom)
    strictEqual(instance.a(), "2a")
  })
})
