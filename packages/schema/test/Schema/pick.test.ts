import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > pick", () => {
  it("struct", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.struct({ [a]: S.string, b: S.NumberFromString, c: S.boolean }).pipe(
      S.pick(a, "b")
    )
    await Util.expectParseSuccess(schema, { [a]: "a", b: "1" }, { [a]: "a", b: 1 })

    await Util.expectParseFailure(
      schema,
      null,
      "Expected { Symbol(@effect/schema/test/a): string; b: NumberFromString }, actual null"
    )
    await Util.expectParseFailure(
      schema,
      { [a]: "a" },
      `{ Symbol(@effect/schema/test/a): string; b: NumberFromString }
└─ ["b"]
   └─ is missing`
    )
    await Util.expectParseFailure(
      schema,
      { b: 1 },
      `{ Symbol(@effect/schema/test/a): string; b: NumberFromString }
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
        S.pick("a", "b")
      )
    await Util.expectParseSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectParseSuccess(schema, { b: "1" }, { b: 1 })

    await Util.expectParseFailure(
      schema,
      null,
      "Expected { a?: string; b: NumberFromString }, actual null"
    )
    await Util.expectParseFailure(
      schema,
      { a: "a" },
      `{ a?: string; b: NumberFromString }
└─ ["b"]
   └─ is missing`
    )
  })

  it("suspend", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const A: S.Schema<never, A> = S.suspend( // intended outer suspend
      () =>
        S.struct({
          a: S.string,
          as: S.array(A)
        })
    )
    const schema = A.pipe(S.pick("as"))
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
      S.pick("a", "b")
    )
    await Util.expectParseSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectParseSuccess(schema, { b: "1" }, { a: "", b: 1 })
  })

  it("record(string, number)", async () => {
    const schema = S.record(S.string, S.number).pipe(S.pick("a", "b"))
    await Util.expectParseSuccess(schema, { a: 1, b: 2 })
    await Util.expectParseFailure(
      schema,
      { a: "a", b: 2 },
      `{ a: number; b: number }
└─ ["a"]
   └─ Expected a number, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      { a: 1, b: "b" },
      `{ a: number; b: number }
└─ ["b"]
   └─ Expected a number, actual "b"`
    )
  })

  it("record(symbol, number)", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.record(S.symbolFromSelf, S.number).pipe(S.pick(a, b))
    await Util.expectParseSuccess(schema, { [a]: 1, [b]: 2 })
    await Util.expectParseFailure(
      schema,
      { [a]: "a", [b]: 2 },
      `{ Symbol(@effect/schema/test/a): number; Symbol(@effect/schema/test/b): number }
└─ [Symbol(@effect/schema/test/a)]
   └─ Expected a number, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      { [a]: 1, [b]: "b" },
      `{ Symbol(@effect/schema/test/a): number; Symbol(@effect/schema/test/b): number }
└─ [Symbol(@effect/schema/test/b)]
   └─ Expected a number, actual "b"`
    )
  })

  it("record(string, string) & record(`a${string}`, number)", async () => {
    const schema = S.record(S.string, S.string).pipe(
      S.extend(S.record(S.templateLiteral(S.literal("a"), S.string), S.number)),
      S.pick("a", "b")
    )
    await Util.expectParseSuccess(schema, { a: 1, b: "b" })
  })
})
