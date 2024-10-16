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

  it("should expose a make constructor", () => {
    class A extends S.Class<A>("A")({
      n: S.NumberFromString
    }) {
      a() {
        return this.n + "a"
      }
    }
    class B extends A.extend<B>("B")({
      c: S.String
    }) {
      b() {
        return this.n + "b"
      }
    }
    const b = B.make({ n: 1, c: "c" })
    expect(b instanceof B).toEqual(true)
    expect(b.a()).toEqual("1a")
    expect(b.b()).toEqual("1b")
  })
})
