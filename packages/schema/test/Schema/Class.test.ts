import * as AST from "@effect/schema/AST"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import * as O from "effect/Option"

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
    id: S.string,
    thing: S.optional(S.struct({ id: S.number })).toOption()
  },
  (input) =>
    PR.success({
      ...input,
      id: input.id.toString(),
      thing: O.some({ id: 123 })
    }),
  (input) =>
    PR.success({
      ...input,
      id: Number(input.id)
    })
) {}

class PersonWithTransformFrom extends Person.transformFrom<PersonWithTransformFrom>()(
  {
    id: S.string,
    thing: S.optional(S.struct({ id: S.number })).toOption()
  },
  (input) =>
    PR.success({
      ...input,
      id: input.id.toString(),
      thing: { id: 123 }
    }),
  (input) =>
    PR.success({
      ...input,
      id: Number(input.id)
    })
) {}

describe("Schema/Class", () => {
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
    expect(john.name).toEqual("John")
    expect(john.upperName).toEqual("JOHN")
    expect(typeof john.upperName).toEqual("string")
    expect(() => new Person({ id: 1, name: "" })).toThrow(
      new Error(`error(s) found
└─ ["name"]
   └─ Expected a non empty string, actual ""`)
    )
  })

  it("keyof", () => {
    expect(S.keyof(S.to(Person))).toEqual(
      S.union(S.literal("id"), S.literal("name"))
    )
  })

  it("is", () => {
    const is = S.is(S.to(Person))
    expect(is(new Person({ id: 1, name: "name" }))).toEqual(true)
  })

  it("schema", async () => {
    const person = S.parseSync(Person)({ id: 1, name: "John" })
    expect(person.name).toEqual("John")

    const PersonFromSelf = S.to(Person)
    await Util.expectParseSuccess(PersonFromSelf, new Person({ id: 1, name: "John" }))
    await Util.expectParseFailure(
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
    expect(person.name).toEqual("John")
    expect(person.age).toEqual(30)
    expect(person.isAdult).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")
  })

  it("extends extends", () => {
    const person = S.parseSync(PersonWithNick)({
      id: 1,
      name: "John",
      age: 30,
      nick: "Joe"
    })
    expect(person.age).toEqual(30)
    expect(person.nick).toEqual("Joe")
  })

  it("extends error", () => {
    expect(() => S.parseSync(PersonWithAge)({ id: 1, name: "John" })).toThrow(
      new Error(`error(s) found
└─ ["age"]
   └─ is missing`)
    )
  })

  it("Data.Class", () => {
    const person = new Person({ id: 1, name: "John" })
    const personAge = new PersonWithAge({ id: 1, name: "John", age: 30 })
    expect(person instanceof Data.Class).toEqual(true)
    expect(personAge instanceof Data.Class).toEqual(true)

    const person2 = new Person({ id: 1, name: "John" })
    expect(Equal.equals(person, person2)).toEqual(true)

    const person3 = new Person({ id: 2, name: "John" })
    expect(!Equal.equals(person, person3)).toEqual(true)
  })

  it("transform", () => {
    const decode = S.decodeSync(PersonWithTransform)
    const person = decode({
      id: 1,
      name: "John"
    })
    expect(person.id).toEqual("1")
    expect(person.name).toEqual("John")
    expect(O.isSome(person.thing) && person.thing.value.id === 123).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")
  })

  it("transform from", () => {
    const decode = S.decodeSync(PersonWithTransformFrom)
    const person = decode({
      id: 1,
      name: "John"
    })
    expect(person.id).toEqual("1")
    expect(person.name).toEqual("John")
    expect(O.isSome(person.thing) && person.thing.value.id === 123).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")
  })
})
