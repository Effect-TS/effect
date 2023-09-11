import * as Data from "@effect/data/Data"
import * as Equal from "@effect/data/Equal"
import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

class Person extends S.Class<Person>()({
  id: S.number,
  name: S.string.pipe(S.nonEmpty())
}) {
  get upperName() {
    return this.name.toUpperCase()
  }
}

class PersonWithAge extends Person.extend<PersonWithAge>()({
  age: S.number
}) {
  get isAdult() {
    return this.age >= 18
  }
}

class PersonWithNick extends PersonWithAge.extend<PersonWithNick>()({
  nick: S.string
}) {}

class PersonWithTransform extends Person.transform<PersonWithTransform>()(
  {
    thing: S.optional(S.struct({ id: S.number })).toOption()
  },
  (input) =>
    PR.success({
      ...input,
      thing: O.some({ id: 123 })
    }),
  PR.success
) {}

class PersonWithTransformFrom extends Person.transformFrom<PersonWithTransformFrom>()(
  {
    thing: S.optional(S.struct({ id: S.number })).toOption()
  },
  (input) =>
    PR.success({
      ...input,
      thing: { id: 123 }
    }),
  PR.success
) {}

describe("Schema/classes", () => {
  it("should be a Schema", () => {
    expect(S.isSchema(Person)).toEqual(true)
    const schema = Person.pipe(S.title("Person"))
    expect(schema.ast.annotations).toEqual({
      [AST.TitleAnnotationId]: "Person"
    })
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("constructor", () => {
    const john = new Person({ id: 1, name: "John" })
    assert(john.name === "John")
    assert(john.upperName === "JOHN")
    expectTypeOf(john.upperName).toEqualTypeOf("string")
    expect(() => new Person({ id: 1, name: "" })).toThrowError(
      new Error(`error(s) found
└─ ["name"]
   └─ Expected a non empty string, actual ""`)
    )
  })

  it("schema", () => {
    const person = S.parseSync(Person)({ id: 1, name: "John" })
    assert(person.name === "John")

    const PersonFromSelf = S.to(Person)
    Util.expectParseSuccess(PersonFromSelf, new Person({ id: 1, name: "John" }))
    Util.expectParseFailure(
      PersonFromSelf,
      { id: 1, name: "John" },
      `Expected an instance of Person, actual {"id":1,"name":"John"}`
    )
  })

  it("extends", () => {
    const person = S.parseSync(PersonWithAge)({
      id: 1,
      name: "John",
      age: 30
    })
    assert(person.name === "John")
    assert(person.age === 30)
    assert(person.isAdult === true)
    assert(person.upperName === "JOHN")
    expectTypeOf(person.upperName).toEqualTypeOf("string")
  })

  it("extends extends", () => {
    const person = S.parseSync(PersonWithNick)({
      id: 1,
      name: "John",
      age: 30,
      nick: "Joe"
    })
    assert(person.age === 30)
    assert(person.nick === "Joe")
  })

  it("extends error", () => {
    expect(() => S.parseSync(PersonWithAge)({ id: 1, name: "John" })).toThrowError(
      new Error(`error(s) found
└─ ["age"]
   └─ is missing`)
    )
  })

  it("Data.Class", () => {
    const person = new Person({ id: 1, name: "John" })
    const personAge = new PersonWithAge({ id: 1, name: "John", age: 30 })
    assert(person instanceof Data.Class)
    assert(personAge instanceof Data.Class)

    const person2 = new Person({ id: 1, name: "John" })
    assert(Equal.equals(person, person2))

    const person3 = new Person({ id: 2, name: "John" })
    assert(!Equal.equals(person, person3))
  })

  it("transform", () => {
    const decode = S.decodeSync(PersonWithTransform)
    const person = decode({
      id: 1,
      name: "John"
    })
    assert(person.id === 1)
    assert(person.name === "John")
    assert(O.isSome(person.thing) && person.thing.value.id === 123)
    assert(person.upperName === "JOHN")
    expectTypeOf(person.upperName).toEqualTypeOf("string")
  })

  it("transform from", () => {
    const decode = S.decodeSync(PersonWithTransformFrom)
    const person = decode({
      id: 1,
      name: "John"
    })
    assert(person.id === 1)
    assert(person.name === "John")
    assert(O.isSome(person.thing) && person.thing.value.id === 123)
    assert(person.upperName === "JOHN")
    expectTypeOf(person.upperName).toEqualTypeOf("string")
  })
})
