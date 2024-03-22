import * as AST from "@effect/schema/AST"
import * as Equivalence from "@effect/schema/Equivalence"
import * as ParseResult from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Util from "@effect/schema/test/util"
import { Context, Effect, Exit, pipe, Struct } from "effect"
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import * as O from "effect/Option"
import * as Request from "effect/Request"
import { assert, describe, expect, it } from "vitest"

class Person extends S.Class<Person>("Person")({
  id: S.number,
  name: S.string.pipe(S.nonEmpty())
}) {
  get upperName() {
    return this.name.toUpperCase()
  }
}

const Name = Context.GenericTag<"Name", string>("Name")
const NameString = S.string.pipe(
  S.nonEmpty(),
  S.transformOrFail(
    S.string,
    (_, _opts, ast) =>
      Name.pipe(
        Effect.filterOrFail(
          (name) => _ === name,
          () => new ParseResult.Type(ast, _, "Does not match Name")
        )
      ),
    (_) => ParseResult.succeed(_)
  )
)

const Id = Context.GenericTag<"Id", number>("Name")
const IdNumber = S.number.pipe(
  S.transformOrFail(
    S.number,
    (_, _opts, ast) =>
      Effect.filterOrFail(
        Id,
        (id) => _ === id,
        () => new ParseResult.Type(ast, _, "Does not match Id")
      ),
    (_) => ParseResult.succeed(_)
  )
)

class TaggedPerson extends S.TaggedClass<TaggedPerson>()("TaggedPerson", {
  id: S.number,
  name: S.string.pipe(S.nonEmpty())
}) {
  get upperName() {
    return this.name.toUpperCase()
  }
}

class TaggedPersonWithAge extends TaggedPerson.extend<TaggedPersonWithAge>("TaggedPersonWithAge")({
  age: S.number
}) {
  get isAdult() {
    return this.age >= 18
  }
}

class PersonWithAge extends Person.extend<PersonWithAge>("PersonWithAge")({
  age: S.number
}) {
  get isAdult() {
    return this.age >= 18
  }
}

class PersonWithNick extends PersonWithAge.extend<PersonWithNick>("PersonWithNick")({
  nick: S.string
}) {}

const Thing = S.optional(S.struct({ id: S.number }), { exact: true, as: "Option" })

class PersonWithTransform extends Person.transformOrFail<PersonWithTransform>("PersonWithTransform")(
  {
    thing: Thing
  },
  (input, _, ast) =>
    input.id === 2 ?
      ParseResult.fail(new ParseResult.Type(ast, input)) :
      ParseResult.succeed({
        ...input,
        thing: O.some({ id: 123 })
      }),
  (input, _, ast) =>
    input.id === 2 ?
      ParseResult.fail(new ParseResult.Type(ast, input)) :
      ParseResult.succeed(input)
) {}

class PersonWithTransformFrom extends Person.transformOrFailFrom<PersonWithTransformFrom>("PersonWithTransformFrom")(
  {
    thing: Thing
  },
  (input, _, ast) =>
    input.id === 2 ?
      ParseResult.fail(new ParseResult.Type(ast, input)) :
      ParseResult.succeed({
        ...input,
        thing: { id: 123 }
      }),
  (input, _, ast) =>
    input.id === 2 ?
      ParseResult.fail(new ParseResult.Type(ast, input)) :
      ParseResult.succeed(input)
) {}

describe("Schema > Class APIs", () => {
  describe("Class", () => {
    it("should be a Schema", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {}
      expect(S.isSchema(A)).toEqual(true)
    })

    it("should expose the fields", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {}
      expect(A.fields).toEqual({ a: S.string })
    })

    it("should expose the identifier", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {}
      expect(A.identifier).toEqual("A")
    })

    it("should add an identifier annotation", () => {
      class A extends S.Class<A>("MyName")({ a: S.string }) {}
      expect((A.ast as AST.Transformation).to.annotations[AST.IdentifierAnnotationId]).toEqual("MyName")
    })

    it("should be a constructor", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {}
      const instance = new A({ a: "a" })
      expect(instance.a).toStrictEqual("a")
      expect(instance instanceof A).toBe(true)
    })

    it("the constructor should validate the input by default", () => {
      class A extends S.Class<A>("A")({ a: S.NonEmpty }) {}
      expect(() => new A({ a: "" })).toThrow(
        new Error(`{ a: NonEmpty }
└─ ["a"]
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""`)
      )
    })

    it("the constructor validation can be disabled", () => {
      class A extends S.Class<A>("A")({ a: S.NonEmpty }) {}
      expect(new A({ a: "" }, true).a).toStrictEqual("")
    })

    it("a Class with no fields should have a void constructor", () => {
      class A extends S.Class<A>("A")({}) {}
      expect({ ...new A() }).toStrictEqual({})
      expect({ ...new A(undefined, true) }).toStrictEqual({})
      expect({ ...new A({}) }).toStrictEqual({})
    })

    it("should support methods", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {
        method(b: string) {
          return `method: ${this.a} ${b}`
        }
      }
      expect(new A({ a: "a" }).method("b")).toEqual("method: a b")
    })

    it("should support getters", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {
        get getter() {
          return `getter: ${this.a}`
        }
      }
      expect(new A({ a: "a" }).getter).toEqual("getter: a")
    })

    it("should support annotations when declaring the Class", () => {
      class A extends S.Class<A>("A")({
        a: S.string
      }, { title: "X" }) {}
      expect((A.ast as AST.Transformation).to.annotations[AST.TitleAnnotationId]).toEqual("X")
    })

    it("using S.annotations() on a Class should return a Schema", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {}
      const schema = A.pipe(S.annotations({ title: "X" }))
      expect(S.isSchema(schema)).toEqual(true)
      expect(schema.ast._tag).toEqual("Transformation")
      expect(schema.ast.annotations[AST.TitleAnnotationId]).toEqual("X")
    })

    it("using the .annotations() method of a Class should return a Schema", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {}
      const schema = A.annotations({ title: "X" })
      expect(S.isSchema(schema)).toEqual(true)
      expect(schema.ast._tag).toEqual("Transformation")
      expect(schema.ast.annotations[AST.TitleAnnotationId]).toEqual("X")
    })

    it("decoding", async () => {
      class A extends S.Class<A>("A")({ a: S.NonEmpty }) {}
      await Util.expectDecodeUnknownSuccess(A, { a: "a" }, new A({ a: "a" }))
      await Util.expectDecodeUnknownFailure(
        A,
        { a: "" },
        `({ a: NonEmpty } <-> A)
└─ Encoded side transformation failure
   └─ { a: NonEmpty }
      └─ ["a"]
         └─ NonEmpty
            └─ Predicate refinement failure
               └─ Expected NonEmpty (a non empty string), actual ""`
      )
    })

    it("encoding", async () => {
      class A extends S.Class<A>("A")({ a: S.NonEmpty }) {}
      await Util.expectEncodeSuccess(A, new A({ a: "a" }), { a: "a" })
      await Util.expectEncodeSuccess(A, { a: "a" }, { a: "a" })
      await Util.expectEncodeFailure(
        A,
        new A({ a: "" }, true),
        `({ a: NonEmpty } <-> A)
└─ Encoded side transformation failure
   └─ { a: NonEmpty }
      └─ ["a"]
         └─ NonEmpty
            └─ Predicate refinement failure
               └─ Expected NonEmpty (a non empty string), actual ""`
      )
    })

    it("a custom _tag field should be allowed", () => {
      class A extends S.Class<A>("A")({ _tag: S.literal("a", "b") }) {}
      expect(A.fields).toStrictEqual({
        _tag: S.literal("a", "b")
      })
    })

    it("duplicated fields should not be allowed when extending with extend()", () => {
      class A extends S.Class<A>("A")({ a: S.string }) {}
      expect(() => {
        class A2 extends A.extend<A2>("A2")({ a: S.string }) {}
        console.log(A2)
      }).toThrow(new Error(`Duplicate property signature "a"`))
    })

    it("can be extended with Class fields", () => {
      class AB extends S.Class<AB>("AB")({ a: S.string, b: S.number }) {}
      class C extends S.Class<C>("C")({
        ...AB.fields,
        b: S.string,
        c: S.boolean
      }) {}
      expect(C.fields).toStrictEqual({
        a: S.string,
        b: S.string,
        c: S.boolean
      })
      expect({ ...new C({ a: "a", b: "b", c: true }) }).toStrictEqual({ a: "a", b: "b", c: true })
    })

    it("can be extended with TaggedClass fields", () => {
      class AB extends S.Class<AB>("AB")({ a: S.string, b: S.number }) {}
      class D extends S.TaggedClass<D>()("D", {
        ...AB.fields,
        b: S.string,
        c: S.boolean
      }) {}
      expect(D.fields).toStrictEqual({
        _tag: S.literal("D"),
        a: S.string,
        b: S.string,
        c: S.boolean
      })
      expect({ ...new D({ a: "a", b: "b", c: true }) }).toStrictEqual({ _tag: "D", a: "a", b: "b", c: true })
    })

    it("S.typeSchema(Class)", async () => {
      const PersonFromSelf = S.typeSchema(Person)
      await Util.expectDecodeUnknownSuccess(PersonFromSelf, new Person({ id: 1, name: "John" }))
      await Util.expectDecodeUnknownFailure(
        PersonFromSelf,
        { id: 1, name: "John" },
        `Expected Person (an instance of Person), actual {"id":1,"name":"John"}`
      )
    })

    it("is", () => {
      const is = S.is(S.typeSchema(Person))
      expect(is(new Person({ id: 1, name: "name" }))).toEqual(true)
      expect(is({ id: 1, name: "name" })).toEqual(false)
    })

    it("with a field with a context !== never", async () => {
      class PersonContext extends S.Class<PersonContext>("PersonContext")({
        ...Person.fields,
        name: NameString
      }) {}

      const person = S.decodeUnknown(PersonContext)({ id: 1, name: "John" }).pipe(
        Effect.provideService(Name, "John"),
        Effect.runSync
      )
      expect(person.name).toEqual("John")

      const PersonFromSelf = S.typeSchema(Person)
      await Util.expectDecodeUnknownSuccess(PersonFromSelf, new Person({ id: 1, name: "John" }))
      await Util.expectDecodeUnknownFailure(
        PersonFromSelf,
        { id: 1, name: "John" },
        `Expected Person (an instance of Person), actual {"id":1,"name":"John"}`
      )
    })
  })

  describe("TaggedClass", () => {
    it("the constructor should add a `_tag` field", () => {
      class TA extends S.TaggedClass<TA>()("TA", { a: S.string }) {}
      expect({ ...new TA({ a: "a" }) }).toStrictEqual({ _tag: "TA", a: "a" })
    })

    it("should expose the fields", () => {
      class TA extends S.TaggedClass<TA>()("TA", { a: S.string }) {}
      expect(TA.fields).toEqual({ _tag: S.literal("TA"), a: S.string })
    })

    it("should expose the identifier", () => {
      class TA extends S.TaggedClass<TA>()("TA", { a: S.string }) {}
      expect(TA.identifier).toEqual("TA")
      class TB extends S.TaggedClass<TB>("id")("TB", { a: S.string }) {}
      expect(TB.identifier).toEqual("id")
    })

    it("constructor parameters should not overwrite the tag", async () => {
      class A extends S.TaggedClass<A>()("A", {
        a: S.string
      }) {}
      expect(new A({ ...{ _tag: "B", a: "a" } })._tag).toBe("A")
      expect(new A({ ...{ _tag: "B", a: "a" } }, true)._tag).toBe("A")
    })

    it("a TaggedClass with no fields should have a void constructor", () => {
      class TA extends S.TaggedClass<TA>()("TA", {}) {}
      expect({ ...new TA() }).toStrictEqual({ _tag: "TA" })
      expect({ ...new TA(undefined) }).toStrictEqual({ _tag: "TA" })
      expect({ ...new TA(undefined, true) }).toStrictEqual({ _tag: "TA" })
    })

    it("a custom _tag field should be not allowed", () => {
      expect(() => {
        // @ts-expect-error
        class _TA extends S.TaggedClass<_TA>()("TA", { _tag: S.literal("X"), a: S.string }) {}
        console.log(_TA)
      }).toThrow(new Error(`Duplicate property signature "_tag"`))
    })

    it("should expose the fields", async () => {
      class TA extends S.TaggedClass<TA>()("TA", { a: S.string }) {}
      expect(TA.fields).toStrictEqual({
        _tag: S.literal("TA"),
        a: S.string
      })
    })

    it("decoding", async () => {
      class TA extends S.TaggedClass<TA>()("TA", { a: S.NonEmpty }) {}
      await Util.expectDecodeUnknownSuccess(TA, { _tag: "TA", a: "a" }, new TA({ a: "a" }))
      await Util.expectDecodeUnknownFailure(
        TA,
        { a: "a" },
        `({ _tag: "TA"; a: NonEmpty } <-> TA)
└─ Encoded side transformation failure
   └─ { _tag: "TA"; a: NonEmpty }
      └─ ["_tag"]
         └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        TA,
        { _tag: "TA", a: "" },
        `({ _tag: "TA"; a: NonEmpty } <-> TA)
└─ Encoded side transformation failure
   └─ { _tag: "TA"; a: NonEmpty }
      └─ ["a"]
         └─ NonEmpty
            └─ Predicate refinement failure
               └─ Expected NonEmpty (a non empty string), actual ""`
      )
    })

    it("encoding", async () => {
      class TA extends S.TaggedClass<TA>()("TA", { a: S.NonEmpty }) {}
      await Util.expectEncodeSuccess(TA, new TA({ a: "a" }), { _tag: "TA", a: "a" })
      await Util.expectEncodeSuccess(TA, { _tag: "TA", a: "a" } as any, { _tag: "TA", a: "a" })
      await Util.expectEncodeFailure(
        TA,
        new TA({ a: "" }, true),
        `({ _tag: "TA"; a: NonEmpty } <-> TA)
└─ Encoded side transformation failure
   └─ { _tag: "TA"; a: NonEmpty }
      └─ ["a"]
         └─ NonEmpty
            └─ Predicate refinement failure
               └─ Expected NonEmpty (a non empty string), actual ""`
      )
    })

    it("can be extended with Class fields", () => {
      class TA extends S.TaggedClass<TA>()("TA", { a: S.string }) {}
      class B extends S.Class<B>("B")({
        b: S.number,
        ...TA.fields
      }) {}
      expect(B.fields).toStrictEqual({
        _tag: S.literal("TA"),
        a: S.string,
        b: S.number
      })
      expect({ ...new B({ _tag: "TA", a: "a", b: 1 }) }).toStrictEqual({ _tag: "TA", a: "a", b: 1 })
    })

    it("can be extended with TaggedClass fields", () => {
      class TA extends S.TaggedClass<TA>()("TA", { a: S.string }) {}
      class TB extends S.TaggedClass<TB>()("TB", {
        b: S.number,
        ...pipe(TA.fields, Struct.omit("_tag"))
      }) {}
      expect(TB.fields).toStrictEqual({
        _tag: S.literal("TB"),
        a: S.string,
        b: S.number
      })
      expect({ ...new TB({ a: "a", b: 1 }) }).toStrictEqual({ _tag: "TB", a: "a", b: 1 })
    })
  })

  it("extends", () => {
    const person = S.decodeUnknownSync(PersonWithAge)({
      id: 1,
      name: "John",
      age: 30
    })
    expect(PersonWithAge.fields).toStrictEqual({
      ...Person.fields,
      age: S.number
    })
    expect(PersonWithAge.identifier).toStrictEqual("PersonWithAge")
    expect(person.name).toEqual("John")
    expect(person.age).toEqual(30)
    expect(person.isAdult).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")
  })

  it("extends extends", () => {
    const person = S.decodeUnknownSync(PersonWithNick)({
      id: 1,
      name: "John",
      age: 30,
      nick: "Joe"
    })
    expect(person.age).toEqual(30)
    expect(person.nick).toEqual("Joe")
  })

  it("extends error", () => {
    expect(() => S.decodeUnknownSync(PersonWithAge)({ id: 1, name: "John" })).toThrow(
      new Error(
        `({ id: number; age: number; name: a non empty string } <-> PersonWithAge)
└─ Encoded side transformation failure
   └─ { id: number; age: number; name: a non empty string }
      └─ ["age"]
         └─ is missing`
      )
    )
  })

  it("Data.Class", () => {
    const person = new Person({ id: 1, name: "John" })
    const personAge = new PersonWithAge({ id: 1, name: "John", age: 30 })

    expect(String(person)).toEqual(`Person({ "id": 1, "name": "John" })`)
    expect(String(personAge)).toEqual(`PersonWithAge({ "id": 1, "age": 30, "name": "John" })`)

    expect(person instanceof Data.Class).toEqual(true)
    expect(personAge instanceof Data.Class).toEqual(true)

    const person2 = new Person({ id: 1, name: "John" })
    expect(Equal.equals(person, person2)).toEqual(true)

    const person3 = new Person({ id: 2, name: "John" })
    expect(Equal.equals(person, person3)).toEqual(false)
  })

  it("pretty", () => {
    const pretty = Pretty.make(Person)
    expect(pretty(new Person({ id: 1, name: "John" }))).toEqual(
      `Person({ "id": 1, "name": "John" })`
    )
  })

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
    expect(O.isSome(person.thing) && person.thing.value.id === 123).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")

    await Util.expectDecodeUnknownFailure(
      PersonWithTransform,
      {
        id: 2,
        name: "John"
      },
      `(({ id: number; name: a non empty string } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> }) <-> PersonWithTransform)
└─ Encoded side transformation failure
   └─ ({ id: number; name: a non empty string } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> })
      └─ Transformation process failure
         └─ Expected ({ id: number; name: a non empty string } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> }), actual {"id":2,"name":"John"}`
    )
    await Util.expectEncodeFailure(
      PersonWithTransform,
      new PersonWithTransform({ id: 2, name: "John", thing: O.some({ id: 1 }) }),
      `(({ id: number; name: a non empty string } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> }) <-> PersonWithTransform)
└─ Encoded side transformation failure
   └─ ({ id: number; name: a non empty string } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> })
      └─ Transformation process failure
         └─ Expected ({ id: number; name: a non empty string } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> }), actual {"id":2,"name":"John","thing":{
  "_id": "Option",
  "_tag": "Some",
  "value": {
    "id": 1
  }
}}`
    )
  })

  it("transformOrFailFrom", async () => {
    const decode = S.decodeSync(PersonWithTransformFrom)
    const person = decode({
      id: 1,
      name: "John"
    })
    expect(PersonWithTransformFrom.fields).toStrictEqual({
      ...Person.fields,
      thing: Thing
    })
    expect(PersonWithTransformFrom.identifier).toStrictEqual("PersonWithTransformFrom")
    expect(person.id).toEqual(1)
    expect(person.name).toEqual("John")
    expect(O.isSome(person.thing) && person.thing.value.id === 123).toEqual(true)
    expect(person.upperName).toEqual("JOHN")
    expect(typeof person.upperName).toEqual("string")

    await Util.expectDecodeUnknownFailure(
      PersonWithTransformFrom,
      {
        id: 2,
        name: "John"
      },
      `(({ id: number; name: string } <-> ({ id: number; name: a non empty string; thing?: { id: number } } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> })) <-> PersonWithTransformFrom)
└─ Encoded side transformation failure
   └─ ({ id: number; name: string } <-> ({ id: number; name: a non empty string; thing?: { id: number } } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> }))
      └─ Transformation process failure
         └─ Expected ({ id: number; name: string } <-> ({ id: number; name: a non empty string; thing?: { id: number } } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> })), actual {"id":2,"name":"John"}`
    )
    await Util.expectEncodeFailure(
      PersonWithTransformFrom,
      new PersonWithTransformFrom({ id: 2, name: "John", thing: O.some({ id: 1 }) }),
      `(({ id: number; name: string } <-> ({ id: number; name: a non empty string; thing?: { id: number } } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> })) <-> PersonWithTransformFrom)
└─ Encoded side transformation failure
   └─ ({ id: number; name: string } <-> ({ id: number; name: a non empty string; thing?: { id: number } } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> }))
      └─ Transformation process failure
         └─ Expected ({ id: number; name: string } <-> ({ id: number; name: a non empty string; thing?: { id: number } } <-> { id: number; name: a non empty string; thing: Option<{ id: number }> })), actual {"id":2,"name":"John","thing":{"id":1}}`
    )
  })

  it("TaggedClass", () => {
    let person = new TaggedPersonWithAge({ id: 1, name: "John", age: 30 })

    expect(String(person)).toEqual(
      `TaggedPersonWithAge({ "_tag": "TaggedPerson", "id": 1, "age": 30, "name": "John" })`
    )
    expect(person._tag).toEqual("TaggedPerson")
    expect(person.upperName).toEqual("JOHN")

    expect(() => S.decodeUnknownSync(TaggedPersonWithAge)({ id: 1, name: "John", age: 30 })).toThrow(
      new Error(
        `({ _tag: "TaggedPerson"; id: number; age: number; name: a non empty string } <-> TaggedPersonWithAge)
└─ Encoded side transformation failure
   └─ { _tag: "TaggedPerson"; id: number; age: number; name: a non empty string }
      └─ ["_tag"]
         └─ is missing`
      )
    )
    person = S.decodeUnknownSync(TaggedPersonWithAge)({
      _tag: "TaggedPerson",
      id: 1,
      name: "John",
      age: 30
    })
    expect(person._tag).toEqual("TaggedPerson")
    expect(person.upperName).toEqual("JOHN")
  })

  it("TaggedError", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      id: S.number
    }) {}

    let err = new MyError({ id: 1 })

    expect(String(err)).toEqual(`MyError({ "_tag": "MyError", "id": 1 })`)
    expect(err.stack).toContain("Class.test.ts:")
    expect(err._tag).toEqual("MyError")
    expect(err.id).toEqual(1)

    err = Effect.runSync(Effect.flip(err))
    expect(err._tag).toEqual("MyError")
    expect(err.id).toEqual(1)

    err = S.decodeUnknownSync(MyError)({ _tag: "MyError", id: 1 })
    expect(err._tag).toEqual("MyError")
    expect(err.id).toEqual(1)
  })

  it("TaggedError/message", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      id: S.number
    }) {
      get message() {
        return `bad id: ${this.id}`
      }
    }

    const err = new MyError({ id: 1 })

    expect(String(err)).include(`MyError: bad id: 1`)
    expect(String(err)).toContain("Class.test.ts:")
    expect(err.stack).toContain("Class.test.ts:")
    expect(err._tag).toEqual("MyError")
    expect(err.id).toEqual(1)
  })

  describe("TaggedRequest", () => {
    it("should expose the fields", () => {
      class TRA extends S.TaggedRequest<TRA>()("TRA", S.string, S.number, {
        id: S.number
      }) {}
      expect(TRA.fields).toStrictEqual({
        _tag: S.literal("TRA"),
        id: S.number
      })
    })

    it("should expose the identifier", () => {
      class TRA extends S.TaggedRequest<TRA>()("TRA", S.string, S.number, {
        id: S.number
      }) {}
      expect(TRA.identifier).toEqual("TRA")
      class TRB extends S.TaggedRequest<TRB>("id")("TRB", S.string, S.number, {
        id: S.number
      }) {}
      expect(TRB.identifier).toEqual("id")
    })

    it("baseline", () => {
      class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", S.string, S.number, {
        id: S.number
      }) {}

      let req = new MyRequest({ id: 1 })

      expect(String(req)).toEqual(`MyRequest({ "_tag": "MyRequest", "id": 1 })`)
      expect(req._tag).toEqual("MyRequest")
      expect(req.id).toEqual(1)
      expect(Request.isRequest(req)).toEqual(true)

      req = S.decodeSync(MyRequest)({ _tag: "MyRequest", id: 1 })
      expect(req._tag).toEqual("MyRequest")
      expect(req.id).toEqual(1)
      expect(Request.isRequest(req)).toEqual(true)
    })

    it("TaggedRequest extends SerializableWithExit", () => {
      class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", S.string, S.NumberFromString, {
        id: S.number
      }) {}

      const req = new MyRequest({ id: 1 })
      assert.deepStrictEqual(
        Serializable.serialize(req).pipe(Effect.runSync),
        { _tag: "MyRequest", id: 1 }
      )
      assert(Equal.equals(
        Serializable.deserialize(req, { _tag: "MyRequest", id: 1 }).pipe(Effect.runSync),
        req
      ))
      assert.deepStrictEqual(
        Serializable.serializeExit(req, Exit.fail("fail")).pipe(Effect.runSync),
        { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } }
      )
      assert.deepStrictEqual(
        Serializable.deserializeExit(req, { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } })
          .pipe(Effect.runSync),
        Exit.fail("fail")
      )
      assert.deepStrictEqual(
        Serializable.serializeExit(req, Exit.succeed(123)).pipe(Effect.runSync),
        { _tag: "Success", value: "123" }
      )
      assert.deepStrictEqual(
        Serializable.deserializeExit(req, { _tag: "Success", value: "123" }).pipe(Effect.runSync),
        Exit.succeed(123)
      )
    })

    it("TaggedRequest context", () => {
      class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", NameString, S.number, {
        id: IdNumber
      }) {}

      let req = new MyRequest({ id: 1 }, true)
      expect(String(req)).toEqual(`MyRequest({ "_tag": "MyRequest", "id": 1 })`)

      req = S.decode(MyRequest)({ _tag: "MyRequest", id: 1 }).pipe(
        Effect.provideService(Id, 1),
        Effect.runSync
      )
      expect(String(req)).toEqual(`MyRequest({ "_tag": "MyRequest", "id": 1 })`)

      assert.deepStrictEqual(
        Serializable.serialize(req).pipe(
          Effect.provideService(Id, 1),
          Effect.runSync
        ),
        { _tag: "MyRequest", id: 1 }
      )
      assert.deepStrictEqual(
        Serializable.deserialize(req, { _tag: "MyRequest", id: 1 }).pipe(
          Effect.provideService(Id, 1),
          Effect.runSync
        ),
        req
      )
      assert.deepStrictEqual(
        Serializable.serializeExit(req, Exit.fail("fail")).pipe(
          Effect.provideService(Name, "fail"),
          Effect.runSync
        ),
        { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } }
      )
      assert.deepStrictEqual(
        Serializable.deserializeExit(req, { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } })
          .pipe(
            Effect.provideService(Name, "fail"),
            Effect.runSync
          ),
        Exit.fail("fail")
      )
    })
  })

  describe("encode", () => {
    it("struct a class without methods nor getters", async () => {
      class A extends S.Class<A>("A")({
        n: S.NumberFromString
      }) {}
      await Util.expectEncodeSuccess(A, { n: 1 }, { n: "1" })
    })

    it("struct a class with a getter", async () => {
      class A extends S.Class<A>("A")({
        n: S.NumberFromString
      }) {
        get s() {
          return "s"
        }
      }
      await Util.expectEncodeSuccess(A, { n: 1 } as any, { n: "1" })
    })

    it("struct nested classes", async () => {
      class A extends S.Class<A>("A")({
        n: S.NumberFromString
      }) {}
      class B extends S.Class<B>("B")({
        a: A
      }) {}
      await Util.expectEncodeSuccess(S.union(B, S.NumberFromString), 1, "1")
      await Util.expectEncodeSuccess(B, { a: { n: 1 } }, { a: { n: "1" } })
    })

    it("class a class with a getter", async () => {
      class A extends S.Class<A>("A")({
        n: S.NumberFromString
      }) {
        get s() {
          return "s"
        }
      }
      class B extends S.Class<B>("B")({
        n: S.NumberFromString,
        s: S.string
      }) {}

      await Util.expectEncodeSuccess(B, new A({ n: 1 }), { n: "1", s: "s" })
    })

    describe("encode(S.typeSchema(Class))", () => {
      it("should always return an instance", async () => {
        class A extends S.Class<A>("A")({
          n: S.NumberFromString
        }) {}
        const schema = S.typeSchema(A)
        await Util.expectEncodeSuccess(schema, new A({ n: 1 }), new A({ n: 1 }))
        await Util.expectEncodeSuccess(schema, { n: 1 }, new A({ n: 1 }))
      })

      it("should fail on bad values", async () => {
        class A extends S.Class<A>("A")({
          n: S.NumberFromString
        }) {}
        const schema = S.typeSchema(A)
        await Util.expectEncodeFailure(
          schema,
          null as any,
          `A
└─ Expected { n: number }, actual null`
        )
      })
    })
  })

  it("equivalence", () => {
    class A extends S.TaggedClass<A>()("A", {
      a: S.string
    }) {}
    const eqA = Equivalence.make(A)
    expect(eqA(new A({ a: "a" }), new A({ a: "a" }))).toBe(true)
    expect(eqA(new A({ a: "a" }), new A({ a: "b" }))).toBe(false)

    class B extends S.TaggedClass<B>()("B", {
      b: S.number,
      as: S.array(A)
    }) {}
    const eqB = Equivalence.make(B)
    expect(eqB(new B({ b: 1, as: [] }), new B({ b: 1, as: [] }))).toBe(true)
    expect(eqB(new B({ b: 1, as: [] }), new B({ b: 2, as: [] }))).toBe(false)
    expect(eqB(new B({ b: 1, as: [new A({ a: "a" })] }), new B({ b: 1, as: [new A({ a: "a" })] }))).toBe(true)
    expect(eqB(new B({ b: 1, as: [new A({ a: "a" })] }), new B({ b: 1, as: [new A({ a: "b" })] }))).toBe(false)
  })
})
