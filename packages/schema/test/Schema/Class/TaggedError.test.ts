import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { jestExpect as expect } from "@jest/expect"
import { Effect } from "effect"
import { describe, it } from "vitest"

describe("TaggedError", () => {
  it("should expose the fields and the tag", () => {
    class TE extends S.TaggedError<TE>()("TE", { a: S.String }) {}
    Util.expectFields(TE.fields, { _tag: S.getClassTag("TE"), a: S.String })
    expect(S.Struct(TE.fields).make({ a: "a" })).toStrictEqual({ _tag: "TE", a: "a" })
    expect(TE._tag).toBe("TE")
  })

  it("should accept a simple object as argument", () => {
    const fields = { a: S.String, b: S.Number }
    class A extends S.TaggedError<A>()("A", { fields }) {}
    Util.expectFields(A.fields, { _tag: S.getClassTag("A"), ...fields })
    class B extends S.TaggedError<B>()("B", { from: { fields } }) {}
    Util.expectFields(B.fields, { _tag: S.getClassTag("B"), ...fields })
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
    await Util.expectDecodeUnknownSuccess(A, new A({ a: 1, b: 1 }))
    await Util.expectDecodeUnknownFailure(
      A,
      { _tag: "A", a: 1, b: 2 },
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

  it("baseline", () => {
    class MyError extends S.TaggedError<MyError>()("MyError", {
      id: S.Number
    }) {}

    let err = new MyError({ id: 1 })

    expect(String(err)).toEqual(`MyError({ "_tag": "MyError", "id": 1 })`)
    expect(err.stack).toContain("TaggedError.test.ts:")
    expect(err._tag).toEqual("MyError")
    expect(err.id).toEqual(1)

    err = Effect.runSync(Effect.flip(err))
    expect(err._tag).toEqual("MyError")
    expect(err.id).toEqual(1)

    err = S.decodeUnknownSync(MyError)({ _tag: "MyError", id: 1 })
    expect(err._tag).toEqual("MyError")
    expect(err.id).toEqual(1)
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

    expect(String(err).includes(`MyError: bad id: 1`)).toBe(true)
    expect(String(err)).toContain("TaggedError.test.ts:")
    expect(err.stack).toContain("TaggedError.test.ts:")
    expect(err._tag).toEqual("MyError")
    expect(err.id).toEqual(1)
  })
})
