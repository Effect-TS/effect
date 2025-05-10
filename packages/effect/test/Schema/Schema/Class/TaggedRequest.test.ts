import { describe, it } from "@effect/vitest"
import { assertInstanceOf, assertSome, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Context, Effect, Equal, Exit, JSONSchema, ParseResult, Request, Schema as S, SchemaAST as AST } from "effect"
import * as Util from "../../TestUtils.js"

const Name = Context.GenericTag<"Name", string>("Name")
const NameString = S.String.pipe(
  S.nonEmptyString(),
  S.transformOrFail(
    S.String,
    {
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

const Id = Context.GenericTag<"Id", number>("Name")
const IdNumber = S.Number.pipe(
  S.transformOrFail(
    S.Number,
    {
      strict: true,
      decode: (_, _opts, ast) =>
        Effect.filterOrFail(
          Id,
          (id) => _ === id,
          () => new ParseResult.Type(ast, _, "Does not match Id")
        ),
      encode: (_) => ParseResult.succeed(_)
    }
  )
)

describe("TaggedRequest", () => {
  it("should expose the fields, the tag, the success and the failure schema", () => {
    class TRA extends S.TaggedRequest<TRA>()("TRA", {
      failure: S.String,
      success: S.Number,
      payload: {
        id: S.Number
      }
    }) {}
    Util.expectFields(TRA.fields, {
      _tag: S.getClassTag("TRA"),
      id: S.Number
    })
    strictEqual(TRA._tag, "TRA")
    strictEqual(TRA.success, S.Number)
    strictEqual(TRA.failure, S.String)
  })

  it("should expose the identifier", () => {
    class TRA extends S.TaggedRequest<TRA>()("TRA", {
      failure: S.String,
      success: S.Number,
      payload: {
        id: S.Number
      }
    }) {}
    strictEqual(TRA.identifier, "TRA")
    class TRB extends S.TaggedRequest<TRB>("id")("TRB", {
      failure: S.String,
      success: S.Number,
      payload: {
        id: S.Number
      }
    }) {}
    strictEqual(TRB.identifier, "id")
  })

  it("baseline", () => {
    class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", {
      failure: S.String,
      success: S.Number,
      payload: {
        id: S.Number
      }
    }) {}

    let req = new MyRequest({ id: 1 })

    strictEqual(String(req), `MyRequest({ "_tag": "MyRequest", "id": 1 })`)
    strictEqual(req._tag, "MyRequest")
    strictEqual(req.id, 1)
    assertTrue(Request.isRequest(req))

    req = S.decodeSync(MyRequest)({ _tag: "MyRequest", id: 1 })
    strictEqual(req._tag, "MyRequest")
    strictEqual(req.id, 1)
    assertTrue(Request.isRequest(req))
  })

  it("TaggedRequest extends SerializableWithExit", () => {
    class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", {
      failure: S.String,
      success: S.NumberFromString,
      payload: {
        id: S.Number
      }
    }) {}

    const req = new MyRequest({ id: 1 })
    deepStrictEqual(
      S.serialize(req).pipe(Effect.runSync),
      { _tag: "MyRequest", id: 1 }
    )
    assertTrue(Equal.equals(
      S.deserialize(req, { _tag: "MyRequest", id: 1 }).pipe(Effect.runSync),
      req
    ))
    deepStrictEqual(
      S.serializeExit(req, Exit.fail("fail")).pipe(Effect.runSync),
      { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } }
    )
    deepStrictEqual(
      S.deserializeExit(req, { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } })
        .pipe(Effect.runSync),
      Exit.fail("fail")
    )
    deepStrictEqual(
      S.serializeExit(req, Exit.succeed(123)).pipe(Effect.runSync),
      { _tag: "Success", value: "123" }
    )
    deepStrictEqual(
      S.deserializeExit(req, { _tag: "Success", value: "123" }).pipe(Effect.runSync),
      Exit.succeed(123)
    )
  })

  it("TaggedRequest context", () => {
    class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", {
      failure: NameString,
      success: S.Number,
      payload: {
        id: IdNumber
      }
    }) {}

    let req = new MyRequest({ id: 1 }, true)
    strictEqual(String(req), `MyRequest({ "_tag": "MyRequest", "id": 1 })`)

    req = S.decode(MyRequest)({ _tag: "MyRequest", id: 1 }).pipe(
      Effect.provideService(Id, 1),
      Effect.runSync
    )
    strictEqual(String(req), `MyRequest({ "_tag": "MyRequest", "id": 1 })`)

    deepStrictEqual(
      S.serialize(req).pipe(
        Effect.provideService(Id, 1),
        Effect.runSync
      ),
      { _tag: "MyRequest", id: 1 }
    )
    deepStrictEqual(
      S.deserialize(req, { _tag: "MyRequest", id: 1 }).pipe(
        Effect.provideService(Id, 1),
        Effect.runSync
      ),
      req
    )
    deepStrictEqual(
      S.serializeExit(req, Exit.fail("fail")).pipe(
        Effect.provideService(Name, "fail"),
        Effect.runSync
      ),
      { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } }
    )
    deepStrictEqual(
      S.deserializeExit(req, { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } })
        .pipe(
          Effect.provideService(Name, "fail"),
          Effect.runSync
        ),
      Exit.fail("fail")
    )
  })

  it("should expose a make constructor", () => {
    class TRA extends S.TaggedRequest<TRA>()("TRA", {
      failure: S.String,
      success: S.Number,
      payload: {
        n: S.NumberFromString
      }
    }) {
      a() {
        return this.n + "a"
      }
    }
    const tra = TRA.make({ n: 1 })
    assertInstanceOf(tra, TRA)
    strictEqual(tra._tag, "TRA")
    strictEqual(tra.a(), "1a")
  })

  describe("should support annotations when declaring the Class", () => {
    it("single argument", async () => {
      class A extends S.TaggedRequest<A>()("A", {
        failure: S.String,
        success: S.Number,
        payload: {
          a: S.NonEmptyString
        }
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
      class A extends S.TaggedRequest<A>()("A", {
        failure: S.String,
        success: S.Number,
        payload: {
          a: S.NonEmptyString
        }
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
      └─ ["_tag"]
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
            "required": ["_tag", "a"],
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
            "required": ["_tag", "a"],
            "type": "object"
          }
        },
        "$ref": "#/$defs/TransformationID",
        "$schema": "http://json-schema.org/draft-07/schema#"
      })
    })
  })
})
