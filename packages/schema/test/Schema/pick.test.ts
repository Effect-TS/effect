import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/pick", () => {
  it("struct", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.struct({ [a]: S.string, b: S.NumberFromString, c: S.boolean }).pipe(
      S.pick(a, "b")
    )
    await Util.expectParseSuccess(schema, { [a]: "a", b: "1" }, { [a]: "a", b: 1 })

    await Util.expectParseFailure(
      schema,
      null,
      "Expected <anonymous type literal schema>, actual null"
    )
    await Util.expectParseFailure(schema, { [a]: "a" }, `/b is missing`)
    await Util.expectParseFailure(
      schema,
      { b: 1 },
      `/Symbol(@effect/schema/test/a) is missing`
    )
  })

  it("struct with optionals", async () => {
    const schema = S.struct({
      a: S.optional(S.string, { exact: true }),
      b: S.NumberFromString,
      c: S.boolean
    })
      .pipe(
        S.pick("a", "b")
      )
    await Util.expectParseSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectParseSuccess(schema, { b: "1" }, { b: 1 })

    await Util.expectParseFailure(
      schema,
      null,
      "Expected <anonymous type literal schema>, actual null"
    )
    await Util.expectParseFailure(schema, { a: "a" }, `/b is missing`)
  })

  it("suspend", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const A: S.Schema<A> = S.suspend( // intended outer suspend
      () =>
        S.struct({
          a: S.string,
          as: S.array(A)
        })
    )
    const schema = A.pipe(S.pick("as"))
    await Util.expectParseSuccess(schema, { as: [] })
    await Util.expectParseSuccess(schema, { as: [{ a: "a", as: [] }] })

    await Util.expectParseFailure(schema, { as: [{ as: [] }] }, `/as /0 /a is missing`)
  })

  it("struct with property signature transformations", async () => {
    const schema = S.struct({
      a: S.optional(S.string, { exact: true, default: () => "" }),
      b: S.NumberFromString,
      c: S.boolean
    }).pipe(
      S.pick("a", "b")
    )
    await Util.expectParseSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectParseSuccess(schema, { b: "1" }, { a: "", b: 1 })
  })
})
