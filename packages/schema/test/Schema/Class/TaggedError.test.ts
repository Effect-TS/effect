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

  it("?", () => {
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
