import { describe, it } from "@effect/vitest"
import { Cause, Effect, Inspectable, Schema } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertTrue, deepStrictEqual, strictEqual } from "effect/test/util"

describe("TaggedError", () => {
  it("should expose the fields and the tag", () => {
    class TE extends S.TaggedError<TE>()("TE", { a: S.String }) {}
    Util.expectFields(TE.fields, { _tag: S.getClassTag("TE"), a: S.String })
    deepStrictEqual(S.Struct(TE.fields).make({ a: "a" }), { _tag: "TE", a: "a" })
    strictEqual(TE._tag, "TE")
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
    assertTrue(err.stack?.includes("TaggedError.test.ts:"))
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

    assertTrue(String(err).includes(`MyError: bad id: 1`))
    assertTrue(err.stack?.includes("TaggedError.test.ts:"))
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

    assertTrue(String(err).includes(`MyError: boom`))
    assertTrue(err.stack?.includes("TaggedError.test.ts:"))
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
    assertTrue(a instanceof A)
    strictEqual(a._tag, "A")
    strictEqual(a.a(), "1a")
  })

  it("cause", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      cause: Schema.Defect
    }) {}

    const err = new MyError({ cause: new Error("child") })
    assertTrue(Cause.pretty(Cause.fail(err), { renderErrorCause: true }).includes("[cause]: Error: child"))
    // ensure node renders the error directly
    deepStrictEqual(err[Inspectable.NodeInspectSymbol](), err)
  })
})
