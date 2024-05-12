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

  it("should accept a simple object as argument", () => {
    const baseFields = { base: S.String }
    class Base extends S.Class<Base>("Base")(baseFields) {}
    const fields = { a: S.String, b: S.Number }
    class A extends Base.extend<A>("A")({ fields }) {}
    Util.expectFields(A.fields, { ...baseFields, ...fields })
    class B extends Base.extend<B>("B")({ from: { fields } }) {}
    Util.expectFields(B.fields, { ...baseFields, ...fields })
  })

  it("should accept a Struct as argument", () => {
    const baseFields = { base: S.String }
    class Base extends S.Class<Base>("Base")(baseFields) {}
    const fields = { a: S.String, b: S.Number }
    class A extends Base.extend<A>("A")(S.Struct(fields)) {}
    Util.expectFields(A.fields, { ...baseFields, ...fields })
  })

  it("should accept a refinement of a Struct as argument", async () => {
    const baseFields = { base: S.String }
    class Base extends S.Class<Base>("Base")(baseFields) {}
    const fields = { a: S.Number, b: S.Number }
    class A extends Base.extend<A>("A")(
      S.Struct(fields).pipe(S.filter(({ a, b }) => a === b ? undefined : "a should be equal to b"))
    ) {}
    Util.expectFields(A.fields, { ...baseFields, ...fields })
    await Util.expectDecodeUnknownSuccess(A, new A({ base: "base", a: 1, b: 1 }))
    await Util.expectDecodeUnknownFailure(
      A,
      { base: "base", a: 1, b: 2 },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ Predicate refinement failure
         └─ a should be equal to b`
    )
    expect(() => new A({ base: "base", a: 1, b: 2 })).toThrow(
      new Error(`A (Constructor)
└─ Predicate refinement failure
   └─ a should be equal to b`)
    )
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
