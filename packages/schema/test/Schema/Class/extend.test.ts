import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

class Person extends S.Class<Person>("Person")({
  id: S.Number,
  name: S.String.pipe(S.nonEmpty())
}) {
  get upperName() {
    return this.name.toUpperCase()
  }
}

class PersonWithAge extends Person.extend<PersonWithAge>("PersonWithAge")({
  age: S.Number
}) {
  get isAdult() {
    return this.age >= 18
  }
}

class PersonWithNick extends PersonWithAge.extend<PersonWithNick>("PersonWithNick")({
  nick: S.String
}) {}

describe("extend", () => {
  it("1 extend", () => {
    const person = S.decodeUnknownSync(PersonWithAge)({
      id: 1,
      name: "John",
      age: 30
    })
    expect(PersonWithAge.fields).toStrictEqual({
      ...Person.fields,
      age: S.Number
    })
    expect(PersonWithAge.identifier).toStrictEqual("PersonWithAge")
    expect(person.name).toEqual("John")
    expect(person.age).toEqual(30)
    expect(person.isAdult).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")
  })

  it("2 extend", () => {
    const person = S.decodeUnknownSync(PersonWithNick)({
      id: 1,
      name: "John",
      age: 30,
      nick: "Joe"
    })
    expect(person.age).toEqual(30)
    expect(person.nick).toEqual("Joe")
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      PersonWithAge,
      { id: 1, name: "John" },
      `(PersonWithAge (Encoded side) <-> PersonWithAge)
└─ Encoded side transformation failure
   └─ PersonWithAge (Encoded side)
      └─ ["age"]
         └─ is missing`
    )
  })
})
