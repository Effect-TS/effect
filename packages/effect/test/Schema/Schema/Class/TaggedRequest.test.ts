import { Context, Effect, Exit } from "effect"
import * as Equal from "effect/Equal"
import * as ParseResult from "effect/ParseResult"
import * as Request from "effect/Request"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assert, describe, expect, it } from "vitest"

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
    expect(TRA._tag).toBe("TRA")
    expect(TRA.success).toBe(S.Number)
    expect(TRA.failure).toBe(S.String)
  })

  it("should expose the identifier", () => {
    class TRA extends S.TaggedRequest<TRA>()("TRA", {
      failure: S.String,
      success: S.Number,
      payload: {
        id: S.Number
      }
    }) {}
    expect(TRA.identifier).toEqual("TRA")
    class TRB extends S.TaggedRequest<TRB>("id")("TRB", {
      failure: S.String,
      success: S.Number,
      payload: {
        id: S.Number
      }
    }) {}
    expect(TRB.identifier).toEqual("id")
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
    class MyRequest extends S.TaggedRequest<MyRequest>()("MyRequest", {
      failure: S.String,
      success: S.NumberFromString,
      payload: {
        id: S.Number
      }
    }) {}

    const req = new MyRequest({ id: 1 })
    assert.deepStrictEqual(
      S.serialize(req).pipe(Effect.runSync),
      { _tag: "MyRequest", id: 1 }
    )
    assert(Equal.equals(
      S.deserialize(req, { _tag: "MyRequest", id: 1 }).pipe(Effect.runSync),
      req
    ))
    assert.deepStrictEqual(
      S.serializeExit(req, Exit.fail("fail")).pipe(Effect.runSync),
      { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } }
    )
    assert.deepStrictEqual(
      S.deserializeExit(req, { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } })
        .pipe(Effect.runSync),
      Exit.fail("fail")
    )
    assert.deepStrictEqual(
      S.serializeExit(req, Exit.succeed(123)).pipe(Effect.runSync),
      { _tag: "Success", value: "123" }
    )
    assert.deepStrictEqual(
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
    expect(String(req)).toEqual(`MyRequest({ "_tag": "MyRequest", "id": 1 })`)

    req = S.decode(MyRequest)({ _tag: "MyRequest", id: 1 }).pipe(
      Effect.provideService(Id, 1),
      Effect.runSync
    )
    expect(String(req)).toEqual(`MyRequest({ "_tag": "MyRequest", "id": 1 })`)

    assert.deepStrictEqual(
      S.serialize(req).pipe(
        Effect.provideService(Id, 1),
        Effect.runSync
      ),
      { _tag: "MyRequest", id: 1 }
    )
    assert.deepStrictEqual(
      S.deserialize(req, { _tag: "MyRequest", id: 1 }).pipe(
        Effect.provideService(Id, 1),
        Effect.runSync
      ),
      req
    )
    assert.deepStrictEqual(
      S.serializeExit(req, Exit.fail("fail")).pipe(
        Effect.provideService(Name, "fail"),
        Effect.runSync
      ),
      { _tag: "Failure", cause: { _tag: "Fail", error: "fail" } }
    )
    assert.deepStrictEqual(
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
    expect(tra instanceof TRA).toEqual(true)
    expect(tra._tag).toEqual("TRA")
    expect(tra.a()).toEqual("1a")
  })
})
