import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertInstanceOf,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { Context, Data, Effect, Equal, JSONSchema, ParseResult, Schema as S, SchemaAST as AST } from "effect"
import * as Util from "../../TestUtils.js"

class Person extends S.Class<Person>("Person")({
  id: S.Number,
  name: S.String.pipe(S.nonEmptyString())
}) {
  get upperName() {
    return this.name.toUpperCase()
  }
}

const Name = Context.GenericTag<"Name", string>("Name")
const NameString = S.String.pipe(
  S.nonEmptyString(),
  S.transformOrFail(
    S.String,
    {
      strict: true,
      decode: (_, _opts, ast) =>
        Name.pipe(
          Effect.filterOrFail(
            (name) => _ === name,
            () => new ParseResult.Type(ast, _, "Does not match Name")
          )
        ),
      encode: (_) => ParseResult.succeed(_)
    }
  )
)

class PersonWithAge extends Person.extend<PersonWithAge>("PersonWithAge")({
  age: S.Number
}) {
  get isAdult() {
    return this.age >= 18
  }
}

describe("Class", () => {
  it("suspend before initialization", async () => {
    const schema = S.suspend(() => string)
    class A extends S.Class<A>("A")({ a: S.optional(schema) }) {}
    const string = S.String
    await Util.assertions.decoding.succeed(A, new A({ a: "a" }))
  })

  it("should be a Schema", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    assertTrue(S.isSchema(A))
    strictEqual(String(A), "(A (Encoded side) <-> A)")
    strictEqual(S.format(A), "(A (Encoded side) <-> A)")
  })

  it("should expose the fields", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    deepStrictEqual(A.fields, { a: S.String })
  })

  it("should expose the identifier", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    strictEqual(A.identifier, "A")
  })

  it("should add an identifier annotation", () => {
    class A extends S.Class<A>("MyName")({ a: S.String }) {}
    strictEqual(A.ast.to.annotations[AST.IdentifierAnnotationId], "MyName")
  })

  describe("constructor", () => {
    it("should be a constructor", () => {
      class A extends S.Class<A>("A")({ a: S.String }) {}
      const instance = new A({ a: "a" })
      strictEqual(instance.a, "a")
      assertInstanceOf(instance, A)
    })

    it("should validate the input by default", () => {
      class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
      Util.assertions.parseError(
        () => new A({ a: "" }),
        `A (Constructor)
└─ ["a"]
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected a non empty string, actual ""`
      )
      Util.assertions.parseError(
        () => A.make({ a: "" }),
        `A (Constructor)
└─ ["a"]
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected a non empty string, actual ""`
      )
    })

    it("validation can be disabled", () => {
      class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
      strictEqual(new A({ a: "" }, true).a, "")
      strictEqual(new A({ a: "" }, { disableValidation: true }).a, "")

      strictEqual(A.make({ a: "" }, true).a, "")
      strictEqual(A.make({ a: "" }, { disableValidation: true }).a, "")
    })

    it("should support defaults", () => {
      const b = Symbol.for("b")
      class A extends S.Class<A>("A")({
        a: S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")),
        [b]: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => 1))
      }) {}
      deepStrictEqual({ ...new A({ a: "a", [b]: 2 }) }, { a: "a", [b]: 2 })
      deepStrictEqual({ ...new A({ a: "a" }) }, { a: "a", [b]: 1 })
      deepStrictEqual({ ...new A({ [b]: 2 }) }, { a: "", [b]: 2 })
      deepStrictEqual({ ...new A({}) }, { a: "", [b]: 1 })

      deepStrictEqual({ ...A.make({ a: "a", [b]: 2 }) }, { a: "a", [b]: 2 })
      deepStrictEqual({ ...A.make({ a: "a" }) }, { a: "a", [b]: 1 })
      deepStrictEqual({ ...A.make({ [b]: 2 }) }, { a: "", [b]: 2 })
      deepStrictEqual({ ...A.make({}) }, { a: "", [b]: 1 })
    })

    it("should support lazy defaults", () => {
      let i = 0
      class A extends S.Class<A>("A")({
        a: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => ++i))
      }) {}
      deepStrictEqual({ ...new A({}) }, { a: 1 })
      deepStrictEqual({ ...new A({}) }, { a: 2 })
      new A({ a: 10 })
      deepStrictEqual({ ...new A({}) }, { a: 3 })

      deepStrictEqual({ ...A.make({}) }, { a: 4 })
      deepStrictEqual({ ...A.make({}) }, { a: 5 })
      new A({ a: 10 })
      deepStrictEqual({ ...A.make({}) }, { a: 6 })
    })

    it("should treat `undefined` as missing field", () => {
      class A extends S.Class<A>("A")({
        a: S.propertySignature(S.UndefinedOr(S.String)).pipe(S.withConstructorDefault(() => ""))
      }) {}
      deepStrictEqual({ ...new A({}) }, { a: "" })
      deepStrictEqual({ ...new A({ a: undefined }) }, { a: "" })

      deepStrictEqual({ ...A.make({}) }, { a: "" })
      deepStrictEqual({ ...A.make({ a: undefined }) }, { a: "" })
    })

    it("should accept void if the Class has no fields", () => {
      class A extends S.Class<A>("A")({}) {}
      deepStrictEqual({ ...new A() }, {})
      deepStrictEqual({ ...new A(undefined) }, {})
      deepStrictEqual({ ...new A(undefined, true) }, {})
      deepStrictEqual({ ...new A(undefined, false) }, {})
      deepStrictEqual({ ...new A({}) }, {})

      deepStrictEqual({ ...A.make() }, {})
      deepStrictEqual({ ...A.make(undefined) }, {})
      deepStrictEqual({ ...A.make(undefined, true) }, {})
      deepStrictEqual({ ...A.make(undefined, false) }, {})
      deepStrictEqual({ ...A.make({}) }, {})
    })

    it("should accept void if the Class has all the fields with a default", () => {
      class A extends S.Class<A>("A")({
        a: S.String.pipe(S.propertySignature, S.withConstructorDefault(() => ""))
      }) {}
      deepStrictEqual({ ...new A() }, { a: "" })
      deepStrictEqual({ ...new A(undefined) }, { a: "" })
      deepStrictEqual({ ...new A(undefined, true) }, { a: "" })
      deepStrictEqual({ ...new A(undefined, false) }, { a: "" })
      deepStrictEqual({ ...new A({}) }, { a: "" })

      deepStrictEqual({ ...A.make() }, { a: "" })
      deepStrictEqual({ ...A.make(undefined) }, { a: "" })
      deepStrictEqual({ ...A.make(undefined, true) }, { a: "" })
      deepStrictEqual({ ...A.make(undefined, false) }, { a: "" })
      deepStrictEqual({ ...A.make({}) }, { a: "" })
    })
  })

  it("should support methods", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {
      method(b: string) {
        return `method: ${this.a} ${b}`
      }
    }
    strictEqual(new A({ a: "a" }).method("b"), "method: a b")
  })

  it("should support getters", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {
      get getter() {
        return `getter: ${this.a}`
      }
    }
    strictEqual(new A({ a: "a" }).getter, "getter: a")
  })

  it("using S.annotations() on a Class should return a Schema", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    const schema = A.pipe(S.annotations({ title: "X" }))
    assertTrue(S.isSchema(schema))
    strictEqual(schema.ast._tag, "Transformation")
    strictEqual(schema.ast.annotations[AST.TitleAnnotationId], "X")
  })

  it("using the .annotations() method of a Class should return a Schema", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    const schema = A.annotations({ title: "X" })
    assertTrue(S.isSchema(schema))
    strictEqual(schema.ast._tag, "Transformation")
    strictEqual(schema.ast.annotations[AST.TitleAnnotationId], "X")
  })

  it("default toString()", () => {
    const b = Symbol.for("b")
    class A extends S.Class<A>("A")({ a: S.String, [b]: S.Number }) {}
    strictEqual(String(new A({ a: "a", [b]: 1 })), `A({ "a": "a", Symbol(b): 1 })`)
  })

  it("decoding", async () => {
    class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
    await Util.assertions.decoding.succeed(A, { a: "a" }, new A({ a: "a" }))
    await Util.assertions.decoding.fail(
      A,
      { a: "" },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
    )
  })

  it("encoding", async () => {
    class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
    await Util.assertions.encoding.succeed(A, new A({ a: "a" }), { a: "a" })
    await Util.assertions.encoding.succeed(A, { a: "a" }, { a: "a" })
    await Util.assertions.encoding.fail(
      A,
      new A({ a: "" }, true),
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
    )
  })

  it("a custom _tag field should be allowed", () => {
    class A extends S.Class<A>("A")({ _tag: S.Literal("a", "b") }) {}
    Util.expectFields(A.fields, {
      _tag: S.Literal("a", "b")
    })
  })

  it("duplicated fields should not be allowed when extending with extend()", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    throws(
      () => {
        class A2 extends A.extend<A2>("A2")({ a: S.String }) {}
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        A2
      },
      new Error(`Duplicate property signature
details: Duplicate key "a"`)
    )
  })

  it("can be extended with Class fields", () => {
    class AB extends S.Class<AB>("AB")({ a: S.String, b: S.Number }) {}
    class C extends S.Class<C>("C")({
      ...AB.fields,
      b: S.String,
      c: S.Boolean
    }) {}
    Util.expectFields(C.fields, {
      a: S.String,
      b: S.String,
      c: S.Boolean
    })
    deepStrictEqual({ ...new C({ a: "a", b: "b", c: true }) }, { a: "a", b: "b", c: true })
  })

  it("can be extended with TaggedClass fields", () => {
    class AB extends S.Class<AB>("AB")({ a: S.String, b: S.Number }) {}
    class D extends S.TaggedClass<D>()("D", {
      ...AB.fields,
      b: S.String,
      c: S.Boolean
    }) {}
    Util.expectFields(D.fields, {
      _tag: S.getClassTag("D"),
      a: S.String,
      b: S.String,
      c: S.Boolean
    })
    deepStrictEqual({ ...new D({ a: "a", b: "b", c: true }) }, { _tag: "D", a: "a", b: "b", c: true })
  })

  it("S.typeSchema(Class)", async () => {
    const PersonFromSelf = S.typeSchema(Person)
    await Util.assertions.decoding.succeed(PersonFromSelf, new Person({ id: 1, name: "John" }))
    await Util.assertions.decoding.fail(
      PersonFromSelf,
      { id: 1, name: "John" },
      `Expected Person, actual {"id":1,"name":"John"}`
    )
  })

  it("is", () => {
    const is = S.is(S.typeSchema(Person))
    assertTrue(is(new Person({ id: 1, name: "name" })))
    assertFalse(is({ id: 1, name: "name" }))
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
    strictEqual(person.name, "John")

    const PersonFromSelf = S.typeSchema(Person)
    await Util.assertions.decoding.succeed(PersonFromSelf, new Person({ id: 1, name: "John" }))
    await Util.assertions.decoding.fail(
      PersonFromSelf,
      { id: 1, name: "John" },
      `Expected Person, actual {"id":1,"name":"John"}`
    )
  })

  it("should accept a Struct as argument", () => {
    const fields = { a: S.String, b: S.Number }
    class A extends S.Class<A>("A")(S.Struct(fields)) {}
    Util.expectFields(A.fields, fields)
  })

  it("should accept a refinement of a Struct as argument", async () => {
    const fields = { a: S.Number, b: S.Number }
    class A extends S.Class<A>("A")(
      S.Struct(fields).pipe(S.filter(({ a, b }) => a === b ? undefined : "a should be equal to b"))
    ) {}
    Util.expectFields(A.fields, fields)
    await Util.assertions.decoding.succeed(A, new A({ a: 1, b: 1 }))
    await Util.assertions.decoding.fail(
      A,
      { a: 1, b: 2 },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ Predicate refinement failure
         └─ a should be equal to b`
    )
    Util.assertions.parseError(
      () => new A({ a: 1, b: 2 }),
      `A (Constructor)
└─ Predicate refinement failure
   └─ a should be equal to b`
    )
  })

  it("Data.Class", () => {
    const person = new Person({ id: 1, name: "John" })
    const personAge = new PersonWithAge({ id: 1, name: "John", age: 30 })

    strictEqual(String(person), `Person({ "id": 1, "name": "John" })`)
    strictEqual(String(personAge), `PersonWithAge({ "id": 1, "name": "John", "age": 30 })`)

    assertInstanceOf(person, Data.Class)
    assertInstanceOf(personAge, Data.Class)

    const person2 = new Person({ id: 1, name: "John" })
    assertTrue(Equal.equals(person, person2))

    const person3 = new Person({ id: 2, name: "John" })
    assertFalse(Equal.equals(person, person3))
  })

  it("pretty", () => {
    const schema = Person
    Util.assertions.pretty(schema, new Person({ id: 1, name: "John" }), `Person({ "id": 1, "name": "John" })`)
  })

  describe("encode", () => {
    it("struct a class without methods nor getters", async () => {
      class A extends S.Class<A>("A")({
        n: S.NumberFromString
      }) {}
      await Util.assertions.encoding.succeed(A, { n: 1 }, { n: "1" })
    })

    it("struct a class with a getter", async () => {
      class A extends S.Class<A>("A")({
        n: S.NumberFromString
      }) {
        get s() {
          return "s"
        }
      }
      await Util.assertions.encoding.succeed(A, { n: 1 } as any, { n: "1" })
    })

    it("struct nested classes", async () => {
      class A extends S.Class<A>("A")({
        n: S.NumberFromString
      }) {}
      class B extends S.Class<B>("B")({
        a: A
      }) {}
      await Util.assertions.encoding.succeed(S.Union(B, S.NumberFromString), 1, "1")
      await Util.assertions.encoding.succeed(B, { a: { n: 1 } }, { a: { n: "1" } })
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
        s: S.String
      }) {}

      await Util.assertions.encoding.succeed(B, new A({ n: 1 }), { n: "1", s: "s" })
    })

    describe("encode(S.typeSchema(Class))", () => {
      it("should always return an instance", async () => {
        class A extends S.Class<A>("A")({
          n: S.NumberFromString
        }) {}
        const schema = S.typeSchema(A)
        await Util.assertions.encoding.succeed(schema, new A({ n: 1 }), new A({ n: 1 }))
        await Util.assertions.encoding.succeed(schema, { n: 1 }, new A({ n: 1 }))
      })

      it("should fail on bad values", async () => {
        class A extends S.Class<A>("A")({
          n: S.NumberFromString
        }) {}
        const schema = S.typeSchema(A)
        await Util.assertions.encoding.fail(
          schema,
          null as any,
          `Expected A (Type side), actual null`
        )
      })
    })
  })

  it("arbitrary", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    Util.assertions.arbitrary.validateGeneratedValues(A)
  })

  it("should expose a make constructor", () => {
    class A extends S.Class<A>("A")({
      n: S.NumberFromString
    }) {
      a() {
        return this.n + "a"
      }
    }
    const a = A.make({ n: 1 })
    assertInstanceOf(a, A)
    strictEqual(a.a(), "1a")
  })

  describe("should support annotations when declaring the Class", () => {
    it("single argument", async () => {
      class A extends S.Class<A>("A")({
        a: S.NonEmptyString
      }, { title: "mytitle" }) {}

      strictEqual(A.ast.to.annotations[AST.TitleAnnotationId], "mytitle")

      await Util.assertions.encoding.fail(
        A,
        { a: "" },
        `(A (Encoded side) <-> A)
└─ Type side transformation failure
   └─ mytitle
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
      )
    })

    it("tuple argument", async () => {
      class A extends S.Class<A>("A")(
        {
          a: S.NonEmptyString
        },
        [
          { identifier: "TypeID", description: "TypeDescription" },
          { identifier: "TransformationID" },
          { identifier: "EncodedID" }
        ]
      ) {}
      assertSome(AST.getIdentifierAnnotation(A.ast.to), "TypeID")
      assertSome(AST.getIdentifierAnnotation(A.ast), "TransformationID")
      assertSome(AST.getIdentifierAnnotation(A.ast.from), "EncodedID")

      await Util.assertions.decoding.fail(
        A,
        {},
        `TransformationID
└─ Encoded side transformation failure
   └─ EncodedID
      └─ ["a"]
         └─ is missing`
      )

      await Util.assertions.encoding.fail(
        A,
        { a: "" },
        `TransformationID
└─ Type side transformation failure
   └─ TypeID
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
      )

      const ctor = { make: A.make.bind(A) }

      Util.assertions.make.fail(
        ctor,
        null as any,
        `TypeID
└─ ["a"]
   └─ is missing`
      )

      deepStrictEqual(JSONSchema.make(S.typeSchema(A)), {
        "$defs": {
          "NonEmptyString": {
            "title": "nonEmptyString",
            "description": "a non empty string",
            "minLength": 1,
            "type": "string"
          },
          "TypeID": {
            "additionalProperties": false,
            "description": "TypeDescription",
            "properties": {
              "a": {
                "$ref": "#/$defs/NonEmptyString"
              }
            },
            "required": [
              "a"
            ],
            "type": "object"
          }
        },
        "$ref": "#/$defs/TypeID",
        "$schema": "http://json-schema.org/draft-07/schema#"
      })

      deepStrictEqual(JSONSchema.make(A), {
        "$defs": {
          "NonEmptyString": {
            "title": "nonEmptyString",
            "description": "a non empty string",
            "minLength": 1,
            "type": "string"
          },
          "TransformationID": {
            "additionalProperties": false,
            "description": "TypeDescription",
            "properties": {
              "a": {
                "$ref": "#/$defs/NonEmptyString"
              }
            },
            "required": [
              "a"
            ],
            "type": "object"
          }
        },
        "$ref": "#/$defs/TransformationID",
        "$schema": "http://json-schema.org/draft-07/schema#"
      })
    })
  })
})
