import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Util from "@effect/schema/test/TestUtils"
import { jestExpect as expect } from "@jest/expect"
import { Context, Effect, Exit } from "effect"
import * as Equal from "effect/Equal"
import * as Request from "effect/Request"
import { assert, describe, it } from "vitest"

const Name = Context.GenericTag<"Name", string>("Name")
const NameString = S.String.pipe(
  S.nonEmpty(),
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
  it("should expose the fields and the tag", () => {
    class TRA extends S.TaggedRequest<TRA>()("TRA", S.String, S.Number, {
      id: S.Number
    }) {}
    Util.expectFields(TRA.fields, {
      _tag: S.getClassTag("TRA"),
      id: S.Number
    })
    expect(TRA._tag).toBe("TRA")
  })

  it("should expose the identifier", () => {
    class TRA extends S.TaggedRequest<TRA>()("TRA", S.String, S.Number, {
      id: S.Number
    }) {}
    expect(TRA.identifier).toEqual("TRA")
    class TRB extends S.TaggedRequest<TRB>("id")("TRB", S.String, S.Number, {
      id: S.Number
    }) {}
    expect(TRB.identifier).toEqual("id")
  })

  it("baseline", () => {
    class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", S.String, S.Number, {
      id: S.Number
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
    class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", S.String, S.NumberFromString, {
      id: S.Number
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
    class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", NameString, S.Number, {
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
