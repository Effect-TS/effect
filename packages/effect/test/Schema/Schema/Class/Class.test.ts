import {
  Context,
  Data,
  Effect,
  Equal,
  JSONSchema,
  Option,
  ParseResult,
  Pretty,
  Schema as S,
  SchemaAST as AST
} from "effect"
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
    await Util.expectDecodeUnknownSuccess(A, new A({ a: "a" }))
  })

  it("should be a Schema", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    expect(S.isSchema(A)).toEqual(true)
    expect(String(A)).toBe("(A (Encoded side) <-> A)")
    expect(S.format(A)).toBe("(A (Encoded side) <-> A)")
  })

  it("should expose the fields", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    expect(A.fields).toEqual({ a: S.String })
  })

  it("should expose the identifier", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    expect(A.identifier).toEqual("A")
  })

  it("should add an identifier annotation", () => {
    class A extends S.Class<A>("MyName")({ a: S.String }) {}
    expect(A.ast.to.annotations[AST.IdentifierAnnotationId]).toEqual("MyName")
  })

  describe("constructor", () => {
    it("should be a constructor", () => {
      class A extends S.Class<A>("A")({ a: S.String }) {}
      const instance = new A({ a: "a" })
      expect(instance.a).toStrictEqual("a")
      expect(instance instanceof A).toBe(true)
    })

    it("should validate the input by default", () => {
      class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
      expect(() => new A({ a: "" })).toThrow(
        new Error(`A (Constructor)
└─ ["a"]
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected NonEmptyString, actual ""`)
      )
      expect(() => A.make({ a: "" })).toThrow(
        new Error(`A (Constructor)
└─ ["a"]
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected NonEmptyString, actual ""`)
      )
    })

    it("validation can be disabled", () => {
      class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
      expect(new A({ a: "" }, true).a).toStrictEqual("")
      expect(new A({ a: "" }, { disableValidation: true }).a).toStrictEqual("")

      expect(A.make({ a: "" }, true).a).toStrictEqual("")
      expect(A.make({ a: "" }, { disableValidation: true }).a).toStrictEqual("")
    })

    it("should support defaults", () => {
      const b = Symbol.for("b")
      class A extends S.Class<A>("A")({
        a: S.propertySignature(S.String).pipe(S.withConstructorDefault(() => "")),
        [b]: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => 1))
      }) {}
      expect({ ...new A({ a: "a", [b]: 2 }) }).toStrictEqual({ a: "a", [b]: 2 })
      expect({ ...new A({ a: "a" }) }).toStrictEqual({ a: "a", [b]: 1 })
      expect({ ...new A({ [b]: 2 }) }).toStrictEqual({ a: "", [b]: 2 })
      expect({ ...new A({}) }).toStrictEqual({ a: "", [b]: 1 })

      expect({ ...A.make({ a: "a", [b]: 2 }) }).toStrictEqual({ a: "a", [b]: 2 })
      expect({ ...A.make({ a: "a" }) }).toStrictEqual({ a: "a", [b]: 1 })
      expect({ ...A.make({ [b]: 2 }) }).toStrictEqual({ a: "", [b]: 2 })
      expect({ ...A.make({}) }).toStrictEqual({ a: "", [b]: 1 })
    })

    it("should support lazy defaults", () => {
      let i = 0
      class A extends S.Class<A>("A")({
        a: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => ++i))
      }) {}
      expect({ ...new A({}) }).toStrictEqual({ a: 1 })
      expect({ ...new A({}) }).toStrictEqual({ a: 2 })
      new A({ a: 10 })
      expect({ ...new A({}) }).toStrictEqual({ a: 3 })

      expect({ ...A.make({}) }).toStrictEqual({ a: 4 })
      expect({ ...A.make({}) }).toStrictEqual({ a: 5 })
      new A({ a: 10 })
      expect({ ...A.make({}) }).toStrictEqual({ a: 6 })
    })

    it("should treat `undefined` as missing field", () => {
      class A extends S.Class<A>("A")({
        a: S.propertySignature(S.UndefinedOr(S.String)).pipe(S.withConstructorDefault(() => ""))
      }) {}
      expect({ ...new A({}) }).toStrictEqual({ a: "" })
      expect({ ...new A({ a: undefined }) }).toStrictEqual({ a: "" })

      expect({ ...A.make({}) }).toStrictEqual({ a: "" })
      expect({ ...A.make({ a: undefined }) }).toStrictEqual({ a: "" })
    })

    it("should accept void if the Class has no fields", () => {
      class A extends S.Class<A>("A")({}) {}
      expect({ ...new A() }).toStrictEqual({})
      expect({ ...new A(undefined) }).toStrictEqual({})
      expect({ ...new A(undefined, true) }).toStrictEqual({})
      expect({ ...new A(undefined, false) }).toStrictEqual({})
      expect({ ...new A({}) }).toStrictEqual({})

      expect({ ...A.make() }).toStrictEqual({})
      expect({ ...A.make(undefined) }).toStrictEqual({})
      expect({ ...A.make(undefined, true) }).toStrictEqual({})
      expect({ ...A.make(undefined, false) }).toStrictEqual({})
      expect({ ...A.make({}) }).toStrictEqual({})
    })

    it("should accept void if the Class has all the fields with a default", () => {
      class A extends S.Class<A>("A")({
        a: S.String.pipe(S.propertySignature, S.withConstructorDefault(() => ""))
      }) {}
      expect({ ...new A() }).toStrictEqual({ a: "" })
      expect({ ...new A(undefined) }).toStrictEqual({ a: "" })
      expect({ ...new A(undefined, true) }).toStrictEqual({ a: "" })
      expect({ ...new A(undefined, false) }).toStrictEqual({ a: "" })
      expect({ ...new A({}) }).toStrictEqual({ a: "" })

      expect({ ...A.make() }).toStrictEqual({ a: "" })
      expect({ ...A.make(undefined) }).toStrictEqual({ a: "" })
      expect({ ...A.make(undefined, true) }).toStrictEqual({ a: "" })
      expect({ ...A.make(undefined, false) }).toStrictEqual({ a: "" })
      expect({ ...A.make({}) }).toStrictEqual({ a: "" })
    })
  })

  it("should support methods", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {
      method(b: string) {
        return `method: ${this.a} ${b}`
      }
    }
    expect(new A({ a: "a" }).method("b")).toEqual("method: a b")
  })

  it("should support getters", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {
      get getter() {
        return `getter: ${this.a}`
      }
    }
    expect(new A({ a: "a" }).getter).toEqual("getter: a")
  })

  it("using S.annotations() on a Class should return a Schema", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    const schema = A.pipe(S.annotations({ title: "X" }))
    expect(S.isSchema(schema)).toEqual(true)
    expect(schema.ast._tag).toEqual("Transformation")
    expect(schema.ast.annotations[AST.TitleAnnotationId]).toEqual("X")
  })

  it("using the .annotations() method of a Class should return a Schema", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    const schema = A.annotations({ title: "X" })
    expect(S.isSchema(schema)).toEqual(true)
    expect(schema.ast._tag).toEqual("Transformation")
    expect(schema.ast.annotations[AST.TitleAnnotationId]).toEqual("X")
  })

  it("default toString()", () => {
    const b = Symbol.for("b")
    class A extends S.Class<A>("A")({ a: S.String, [b]: S.Number }) {}
    expect(String(new A({ a: "a", [b]: 1 }))).toBe(`A({ "a": "a", Symbol(b): 1 })`)
  })

  it("decoding", async () => {
    class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
    await Util.expectDecodeUnknownSuccess(A, { a: "a" }, new A({ a: "a" }))
    await Util.expectDecodeUnknownFailure(
      A,
      { a: "" },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected NonEmptyString, actual ""`
    )
  })

  it("encoding", async () => {
    class A extends S.Class<A>("A")({ a: S.NonEmptyString }) {}
    await Util.expectEncodeSuccess(A, new A({ a: "a" }), { a: "a" })
    await Util.expectEncodeSuccess(A, { a: "a" }, { a: "a" })
    await Util.expectEncodeFailure(
      A,
      new A({ a: "" }, true),
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected NonEmptyString, actual ""`
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
    expect(() => {
      class A2 extends A.extend<A2>("A2")({ a: S.String }) {}
      A2
    }).toThrow(
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
    expect({ ...new C({ a: "a", b: "b", c: true }) }).toStrictEqual({ a: "a", b: "b", c: true })
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
    expect({ ...new D({ a: "a", b: "b", c: true }) }).toStrictEqual({ _tag: "D", a: "a", b: "b", c: true })
  })

  it("S.typeSchema(Class)", async () => {
    const PersonFromSelf = S.typeSchema(Person)
    await Util.expectDecodeUnknownSuccess(PersonFromSelf, new Person({ id: 1, name: "John" }))
    await Util.expectDecodeUnknownFailure(
      PersonFromSelf,
      { id: 1, name: "John" },
      `Expected Person, actual {"id":1,"name":"John"}`
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
    await Util.expectDecodeUnknownSuccess(A, new A({ a: 1, b: 1 }))
    await Util.expectDecodeUnknownFailure(
      A,
      { a: 1, b: 2 },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ Predicate refinement failure
         └─ a should be equal to b`
    )
    expect(() => new A({ a: 1, b: 2 })).toThrow(
      new Error(`A (Constructor)
└─ Predicate refinement failure
   └─ a should be equal to b`)
    )
  })

  it("Data.Class", () => {
    const person = new Person({ id: 1, name: "John" })
    const personAge = new PersonWithAge({ id: 1, name: "John", age: 30 })

    expect(String(person)).toEqual(`Person({ "id": 1, "name": "John" })`)
    expect(String(personAge)).toEqual(`PersonWithAge({ "id": 1, "name": "John", "age": 30 })`)

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
      await Util.expectEncodeSuccess(S.Union(B, S.NumberFromString), 1, "1")
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
        s: S.String
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
          `Expected A (Type side), actual null`
        )
      })
    })
  })

  it("arbitrary", () => {
    class A extends S.Class<A>("A")({ a: S.String }) {}
    Util.expectArbitrary(A)
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
    expect(a instanceof A).toEqual(true)
    expect(a.a()).toEqual("1a")
  })

  describe("should support annotations when declaring the Class", () => {
    it("single argument", async () => {
      class A extends S.Class<A>("A")({
        a: S.NonEmptyString
      }, { title: "mytitle" }) {}

      expect(A.ast.to.annotations[AST.TitleAnnotationId]).toEqual("mytitle")

      await Util.expectEncodeFailure(
        A,
        { a: "" },
        `(A (Encoded side) <-> A)
└─ Type side transformation failure
   └─ mytitle
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected NonEmptyString, actual ""`
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
      expect(AST.getIdentifierAnnotation(A.ast.to)).toEqual(Option.some("TypeID"))
      expect(AST.getIdentifierAnnotation(A.ast)).toEqual(Option.some("TransformationID"))
      expect(AST.getIdentifierAnnotation(A.ast.from)).toEqual(Option.some("EncodedID"))

      await Util.expectDecodeUnknownFailure(
        A,
        {},
        `TransformationID
└─ Encoded side transformation failure
   └─ EncodedID
      └─ ["a"]
         └─ is missing`
      )

      await Util.expectEncodeFailure(
        A,
        { a: "" },
        `TransformationID
└─ Type side transformation failure
   └─ TypeID
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected NonEmptyString, actual ""`
      )

      const ctor = { make: A.make.bind(A) }

      Util.expectConstructorFailure(
        ctor,
        null,
        `TypeID
└─ ["a"]
   └─ is missing`
      )

      expect(JSONSchema.make(S.typeSchema(A))).toStrictEqual({
        "$defs": {
          "NonEmptyString": {
            "description": "a non empty string",
            "minLength": 1,
            "title": "NonEmptyString",
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

      expect(JSONSchema.make(A)).toStrictEqual(
        {
          "$defs": {
            "NonEmptyString": {
              "description": "a non empty string",
              "minLength": 1,
              "title": "NonEmptyString",
              "type": "string"
            },
            "TransformationID": {
              "additionalProperties": false,
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
        }
      )
    })
  })
})
