import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > omit", () => {
  it("struct", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.struct({ [a]: S.string, b: S.NumberFromString, c: S.boolean }).pipe(
      S.omit("c")
    )
    await Util.expectParseSuccess(schema, { [a]: "a", b: "1" }, { [a]: "a", b: 1 })

    await Util.expectParseFailure(
      schema,
      null,
      "Expected { Symbol(@effect/schema/test/a): string; b: a string <-> number transformation }, actual null"
    )
    await Util.expectParseFailure(
      schema,
      { [a]: "a" },
      `{ Symbol(@effect/schema/test/a): string; b: a string <-> number transformation }
└─ ["b"]
   └─ is missing`
    )
    await Util.expectParseFailure(
      schema,
      { b: 1 },
      `{ Symbol(@effect/schema/test/a): string; b: a string <-> number transformation }
└─ [Symbol(@effect/schema/test/a)]
   └─ is missing`
    )
  })

  it("struct with optionals", async () => {
    const schema = S.struct({
      a: S.optional(S.string, { exact: true }),
      b: S.NumberFromString,
      c: S.boolean
    })
      .pipe(
        S.omit("c")
      )
    await Util.expectParseSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectParseSuccess(schema, { b: "1" }, { b: 1 })

    await Util.expectParseFailure(
      schema,
      null,
      "Expected { a?: string; b: a string <-> number transformation }, actual null"
    )
    await Util.expectParseFailure(
      schema,
      { a: "a" },
      `{ a?: string; b: a string <-> number transformation }
└─ ["b"]
   └─ is missing`
    )
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
    const schema = A.pipe(S.omit("a"))
    await Util.expectParseSuccess(schema, { as: [] })
    await Util.expectParseSuccess(schema, { as: [{ a: "a", as: [] }] })

    await Util.expectParseFailure(
      schema,
      { as: [{ as: [] }] },
      `{ as: ReadonlyArray<<suspended schema>> }
└─ ["as"]
   └─ ReadonlyArray<<suspended schema>>
      └─ [0]
         └─ { a: string; as: ReadonlyArray<<suspended schema>> }
            └─ ["a"]
               └─ is missing`
    )
  })

  it("struct with property signature transformations", async () => {
    const schema = S.struct({
      a: S.optional(S.string, { exact: true, default: () => "" }),
      b: S.NumberFromString,
      c: S.boolean
    }).pipe(
      S.omit("c")
    )
    await Util.expectParseSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectParseSuccess(schema, { b: "1" }, { a: "", b: 1 })
  })
})
