import { describe, it } from "@effect/vitest"
import { assertInclude, assertInstanceOf, assertSome, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Cause, Effect, Inspectable, JSONSchema, Schema, SchemaAST as AST } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("TaggedError", () => {
  it("should expose the fields and the tag", () => {
    class TE extends S.TaggedError<TE>()("TE", { a: S.String }) {}
    Util.expectFields(TE.fields, { _tag: S.getClassTag("TE"), a: S.String })
    deepStrictEqual(S.Struct(TE.fields).make({ a: "a" }), { _tag: "TE", a: "a" })
    strictEqual(TE._tag, "TE")
  })

  it("make should respect custom constructors", () => {
    class MyError extends Schema.TaggedError<MyError>()(
      "MyError",
      { message: Schema.String }
    ) {
      constructor({ a, b }: { a: string; b: string }) {
        super({ message: `${a}:${b}` })
      }
    }

    strictEqual(MyError.make({ a: "a", b: "b" }).message, "a:b")
    strictEqual(new MyError({ a: "a", b: "b" }).message, "a:b")
  })

  it("should accept a Struct as argument", () => {
    const fields = { a: S.String, b: S.Number }
    class A extends S.TaggedError<A>()("A", S.Struct(fields)) {}
    Util.expectFields(A.fields, { _tag: S.getClassTag("A"), ...fields })
  })

  it("should accept a refinement of a Struct as argument", async () => {
    const fields = { a: S.Number, b: S.Number }
    class A extends S.TaggedError<A>()(
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

  it("baseline", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      id: S.Number
    }) {}

    let err = new MyError({ id: 1 })

    strictEqual(String(err), `MyError: { "id": 1 }`)
    assertInclude(err.stack, "TaggedError.test.ts:")
    strictEqual(err._tag, "MyError")
    strictEqual(err.id, 1)

    err = Effect.runSync(Effect.flip(err))
    strictEqual(err._tag, "MyError")
    strictEqual(err.id, 1)

    err = S.decodeUnknownSync(MyError)({ _tag: "MyError", id: 1 })
    strictEqual(err._tag, "MyError")
    strictEqual(err.id, 1)
  })

  it("message", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      id: S.Number
    }) {
      get message() {
        return `bad id: ${this.id}`
      }
    }

    const err = new MyError({ id: 1 })

    assertInclude(String(err), `MyError: bad id: 1`)
    assertInclude(err.stack, "TaggedError.test.ts:")
    strictEqual(err._tag, "MyError")
    strictEqual(err.id, 1)
  })

  it("message field", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      id: S.Number,
      message: S.String
    }) {
    }

    const err = new MyError({ id: 1, message: "boom" })

    assertInclude(String(err), `MyError: boom`)
    assertInclude(err.stack, "TaggedError.test.ts:")
    strictEqual(err._tag, "MyError")
    strictEqual(err.id, 1)
  })

  it("should expose a make constructor", () => {
    class A extends S.TaggedError<A>()("A", {
      n: S.NumberFromString
    }) {
      a() {
        return this.n + "a"
      }
    }
    const a = A.make({ n: 1 })
    assertInstanceOf(a, A)
    strictEqual(a._tag, "A")
    strictEqual(a.a(), "1a")
  })

  it("cause", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      cause: Schema.Defect
    }) {}

    const err = new MyError({ cause: new Error("child") })
    assertInclude(Cause.pretty(Cause.fail(err), { renderErrorCause: true }), "[cause]: Error: child")
    // ensure node renders the error directly
    deepStrictEqual(err[Inspectable.NodeInspectSymbol](), err)
  })

  describe("should support annotations when declaring the Class", () => {
    it("single argument", async () => {
      class A extends S.TaggedError<A>()("A", {
        a: S.NonEmptyString
      }, { title: "mytitle" }) {}

      strictEqual(A.ast.to.annotations[AST.TitleAnnotationId], "mytitle")

      await Util.assertions.encoding.fail(
        A,
        { _tag: "A", a: "" } as any,
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
      class A extends S.TaggedError<A>()("A", {
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
        { _tag: "A", a: "" } as any,
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

  it("should allow an optional `message` field", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      message: S.optional(S.String)
    }) {}

    const err = new MyError({})
    strictEqual(err.message, "")
  })
})
