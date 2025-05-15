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
import { JSONSchema, pipe, Schema as S, SchemaAST as AST, Struct } from "effect"
import * as Util from "../../TestUtils.js"

describe("TaggedClass", () => {
  it("the constructor should add a `_tag` field", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    deepStrictEqual({ ...new TA({ a: "a" }) }, { _tag: "TA", a: "a" })
  })

  it("should expose the fields and the tag", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    Util.expectFields(TA.fields, { _tag: S.getClassTag("TA"), a: S.String })
    deepStrictEqual(S.Struct(TA.fields).make({ a: "a" }), { _tag: "TA", a: "a" })
    strictEqual(TA._tag, "TA")
  })

  it("should expose the identifier", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    strictEqual(TA.identifier, "TA")
    class TB extends S.TaggedClass<TB>("id")("TB", { a: S.String }) {}
    strictEqual(TB.identifier, "id")
  })

  it("constructor parameters should not overwrite the tag", async () => {
    class A extends S.TaggedClass<A>()("A", {
      a: S.String
    }) {}
    strictEqual(new A({ ...{ _tag: "B", a: "a" } })._tag, "A")
    strictEqual(new A({ ...{ _tag: "B", a: "a" } }, true)._tag, "A")
  })

  it("a TaggedClass with no fields should have a void constructor", () => {
    class TA extends S.TaggedClass<TA>()("TA", {}) {}
    deepStrictEqual({ ...new TA() }, { _tag: "TA" })
    deepStrictEqual({ ...new TA(undefined) }, { _tag: "TA" })
    deepStrictEqual({ ...new TA(undefined, true) }, { _tag: "TA" })
  })

  it("a custom _tag field should be not allowed", () => {
    throws(
      () => {
        class _TA extends S.TaggedClass<_TA>()("TA", { _tag: S.Literal("X"), a: S.String }) {}
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        _TA
      },
      new Error(`Duplicate property signature
details: Duplicate key "_tag"`)
    )
  })

  it("should accept a Struct as argument", () => {
    const fields = { a: S.String, b: S.Number }
    class A extends S.TaggedClass<A>()("A", S.Struct(fields)) {}
    Util.expectFields(A.fields, { _tag: S.getClassTag("A"), ...fields })
  })

  it("should accept a refinement of a Struct as argument", async () => {
    const fields = { a: S.Number, b: S.Number }
    class A extends S.TaggedClass<A>()(
      "A",
      S.Struct(fields).pipe(S.filter(({ a, b }) => a === b ? undefined : "a should be equal to b"))
    ) {}
    Util.expectFields(A.fields, { _tag: S.getClassTag("A"), ...fields })
    await Util.assertions.decoding.succeed(A, new A({ a: 1, b: 1 }))
    await Util.assertions.decoding.fail(
      A,
      { _tag: "A", a: 1, b: 2 },
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

  it("decoding", async () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.NonEmptyString }) {}
    await Util.assertions.decoding.succeed(TA, { _tag: "TA", a: "a" }, new TA({ a: "a" }))
    await Util.assertions.decoding.fail(
      TA,
      { a: "a" },
      `(TA (Encoded side) <-> TA)
└─ Encoded side transformation failure
   └─ TA (Encoded side)
      └─ ["_tag"]
         └─ is missing`
    )
    await Util.assertions.decoding.fail(
      TA,
      { _tag: "TA", a: "" },
      `(TA (Encoded side) <-> TA)
└─ Encoded side transformation failure
   └─ TA (Encoded side)
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
    )
  })

  it("encoding", async () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.NonEmptyString }) {}
    await Util.assertions.encoding.succeed(TA, new TA({ a: "a" }), { _tag: "TA", a: "a" })
    await Util.assertions.encoding.succeed(TA, { _tag: "TA", a: "a" } as any, { _tag: "TA", a: "a" })
    await Util.assertions.encoding.fail(
      TA,
      new TA({ a: "" }, true),
      `(TA (Encoded side) <-> TA)
└─ Encoded side transformation failure
   └─ TA (Encoded side)
      └─ ["a"]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected a non empty string, actual ""`
    )
  })

  it("can be extended with Class fields", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    class B extends S.Class<B>("B")({
      b: S.Number,
      ...TA.fields
    }) {}
    Util.expectFields(B.fields, {
      _tag: S.getClassTag("TA"),
      a: S.String,
      b: S.Number
    })
    deepStrictEqual({ ...new B({ _tag: "TA", a: "a", b: 1 }) }, { _tag: "TA", a: "a", b: 1 })
  })

  it("can be extended with TaggedClass fields", () => {
    class TA extends S.TaggedClass<TA>()("TA", { a: S.String }) {}
    class TB extends S.TaggedClass<TB>()("TB", {
      b: S.Number,
      ...pipe(TA.fields, Struct.omit("_tag"))
    }) {}
    Util.expectFields(TB.fields, {
      _tag: S.getClassTag("TB"),
      a: S.String,
      b: S.Number
    })
    deepStrictEqual({ ...new TB({ a: "a", b: 1 }) }, { _tag: "TB", a: "a", b: 1 })
  })

  it("equivalence", () => {
    class A extends S.TaggedClass<A>()("A", {
      a: S.String
    }) {}
    const eqA = S.equivalence(A)
    assertTrue(eqA(new A({ a: "a" }), new A({ a: "a" })))
    assertFalse(eqA(new A({ a: "a" }), new A({ a: "b" })))

    class B extends S.TaggedClass<B>()("B", {
      b: S.Number,
      as: S.Array(A)
    }) {}
    const eqB = S.equivalence(B)
    assertTrue(eqB(new B({ b: 1, as: [] }), new B({ b: 1, as: [] })))
    assertFalse(eqB(new B({ b: 1, as: [] }), new B({ b: 2, as: [] })))
    assertTrue(eqB(new B({ b: 1, as: [new A({ a: "a" })] }), new B({ b: 1, as: [new A({ a: "a" })] })))
    assertFalse(eqB(new B({ b: 1, as: [new A({ a: "a" })] }), new B({ b: 1, as: [new A({ a: "b" })] })))
  })

  it("baseline", () => {
    class TaggedPerson extends S.TaggedClass<TaggedPerson>()("TaggedPerson", {
      id: S.Number,
      name: S.String.pipe(S.nonEmptyString())
    }) {
      get upperName() {
        return this.name.toUpperCase()
      }
    }

    class TaggedPersonWithAge extends TaggedPerson.extend<TaggedPersonWithAge>("TaggedPersonWithAge")({
      age: S.Number
    }) {
      get isAdult() {
        return this.age >= 18
      }
    }

    let person = new TaggedPersonWithAge({ id: 1, name: "John", age: 30 })

    strictEqual(String(person), `TaggedPersonWithAge({ "_tag": "TaggedPerson", "id": 1, "name": "John", "age": 30 })`)
    strictEqual(person._tag, "TaggedPerson")
    strictEqual(person.upperName, "JOHN")

    Util.assertions.parseError(
      () => S.decodeUnknownSync(TaggedPersonWithAge)({ id: 1, name: "John", age: 30 }),
      `(TaggedPersonWithAge (Encoded side) <-> TaggedPersonWithAge)
└─ Encoded side transformation failure
   └─ TaggedPersonWithAge (Encoded side)
      └─ ["_tag"]
         └─ is missing`
    )
    person = S.decodeUnknownSync(TaggedPersonWithAge)({
      _tag: "TaggedPerson",
      id: 1,
      name: "John",
      age: 30
    })
    strictEqual(person._tag, "TaggedPerson")
    strictEqual(person.upperName, "JOHN")
  })

  it("should expose a make constructor", () => {
    class TA extends S.TaggedClass<TA>()("TA", {
      n: S.NumberFromString
    }) {
      a() {
        return this.n + "a"
      }
    }
    const ta = TA.make({ n: 1 })
    assertInstanceOf(ta, TA)
    strictEqual(ta._tag, "TA")
    strictEqual(ta.a(), "1a")
  })

  describe("should support annotations when declaring the Class", () => {
    it("single argument", async () => {
      class A extends S.TaggedClass<A>()("A", {
        a: S.NonEmptyString
      }, { title: "mytitle" }) {}

      strictEqual(A.ast.to.annotations[AST.TitleAnnotationId], "mytitle")

      await Util.assertions.encoding.fail(
        A,
        { _tag: "A", a: "" },
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
      class A extends S.TaggedClass<A>()("A", {
        a: S.NonEmptyString
      }, [
        { identifier: "TypeID", description: "TypeDescription" },
        { identifier: "TransformationID" },
        { identifier: "EncodedID" }
      ]) {}
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
        { _tag: "A", a: "" },
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
              "_tag": {
                "enum": [
                  "A"
                ],
                "type": "string"
              },
              "a": {
                "$ref": "#/$defs/NonEmptyString"
              }
            },
            "required": ["a", "_tag"],
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
              "_tag": {
                "enum": [
                  "A"
                ],
                "type": "string"
              },
              "a": {
                "$ref": "#/$defs/NonEmptyString"
              }
            },
            "required": ["a", "_tag"],
            "type": "object"
          }
        },
        "$ref": "#/$defs/TransformationID",
        "$schema": "http://json-schema.org/draft-07/schema#"
      })
    })
  })
})
